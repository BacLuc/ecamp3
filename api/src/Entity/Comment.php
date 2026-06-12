<?php

namespace App\Entity;

use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Link;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\InputFilter;
use App\Repository\CommentRepository;
use App\State\CommentCreateProcessor;
use App\State\CommentUpdateProcessor;
use App\Validator\AssertBelongsToSameCamp;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * A Comment someone left on an activity, to give feedback on the planned programme,
 * for notes which are only relevant during camp planning, or for other communication.
 */
#[ApiResource(
    operations: [
        new Get(
            security: 'is_granted("CAMP_COLLABORATOR", object) or
                       is_granted("CAMP_IS_PUBLIC", object) or
                       object.author === user',
        ),
        new Patch(
            // Used to resolve / reopen a comment thread (any collaborator, mirroring
            // Google-Docs-style "resolve" behaviour) and to edit the comment text
            // (author only, enforced post-denormalization).
            denormalizationContext: ['groups' => ['update']],
            security: 'is_granted("CAMP_COLLABORATOR", object)',
            securityPostDenormalize: 'object.author === user or object.textHtml === previous_object.textHtml',
            processor: CommentUpdateProcessor::class,
        ),
        new Delete(
            // The author may delete their own comment; camp managers may moderate
            // (delete anyone's), like a document owner in Google Docs.
            security: 'object.author === user or is_granted("CAMP_MANAGER", object)',
        ),
        new GetCollection(
            security: 'is_authenticated()'
        ),
        new Post(
            denormalizationContext: ['groups' => ['create', 'write']],
            securityPostDenormalize: 'is_granted("CAMP_COLLABORATOR", object)',
            processor: CommentCreateProcessor::class,
        ),
        new GetCollection(
            uriTemplate: self::ACTIVITY_SUBRESOURCE_URI_TEMPLATE,
            uriVariables: [
                'activityId' => new Link(
                    toProperty: 'activity',
                    fromClass: Activity::class,
                    security: 'is_granted("CAMP_COLLABORATOR", activity) or
                               is_granted("CAMP_IS_PUBLIC", activity)',
                ),
            ],
            security: 'is_fully_authenticated()',
        ),
    ],
    normalizationContext: ['groups' => ['read']],
    denormalizationContext: ['groups' => ['write']],
    order: ['createTime' => 'ASC'],
)]
#[ApiFilter(filterClass: SearchFilter::class, properties: ['camp', 'activity'])]
#[ORM\Entity(repositoryClass: CommentRepository::class)]
class Comment extends BaseEntity implements BelongsToCampInterface {
    public const ACTIVITY_SUBRESOURCE_URI_TEMPLATE = '/activities/{activityId}/comments{._format}';

    /**
     * The camp this comment belongs to.
     */
    #[ApiProperty(example: '/camps/1a2b3c4d')]
    #[Groups(['read', 'create'])]
    #[ORM\ManyToOne(targetEntity: Camp::class, inversedBy: 'comments')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'cascade')]
    public ?Camp $camp = null;

    /**
     * The activity this comment belongs to.
     */
    #[AssertBelongsToSameCamp]
    #[ApiProperty(example: '/activities/1a2b3c4d')]
    #[Groups(['read', 'create'])]
    #[ORM\ManyToOne(targetEntity: Activity::class, inversedBy: 'comments')]
    #[ORM\JoinColumn(nullable: true)]
    public ?Activity $activity = null;

    /**
     * The author of the comment.
     */
    #[Assert\DisableAutoMapping] // avoids validation error when author is null in payload
    #[ApiProperty(writable: false, example: '/users/1a2b3c4d')]
    #[Groups(['read', 'create'])]
    #[ORM\ManyToOne(targetEntity: User::class, inversedBy: 'comments')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'cascade')]
    public ?User $author = null;

    /**
     * The actual comment.
     */
    #[InputFilter\Trim]
    #[InputFilter\CleanHTML]
    #[Assert\NotBlank]
    #[Assert\Length(max: 1024)]
    #[ApiProperty(example: 'This activity is great!')]
    #[Groups(['read', 'create', 'update'])]
    #[ORM\Column(type: 'text', nullable: false)]
    public ?string $textHtml = null;

    /**
     * The parent comment, when this comment is a reply in a thread.
     * Root comments of a thread (and plain activity-level comments) have no parent.
     * Threads are flat: replies always point at the root comment, and only the
     * root carries the anchor (replies inherit it).
     */
    #[AssertBelongsToSameCamp]
    #[Assert\Expression(
        'this.parent === null or this.parent.parent === null',
        message: 'Replies cannot be nested. Reply to the root comment of the thread.',
    )]
    #[Assert\Expression(
        'this.parent === null or this.parent.activity === this.activity',
        message: 'A reply must belong to the same activity as its parent.',
    )]
    #[Assert\Expression(
        'this.parent === null or (this.anchorId === null and this.contentNode === null)',
        message: 'Replies inherit the anchor from the root comment and cannot carry their own.',
    )]
    #[ApiProperty(example: '/comments/1a2b3c4d')]
    #[Groups(['read', 'create'])]
    #[ORM\ManyToOne(targetEntity: self::class, inversedBy: 'children')]
    #[ORM\JoinColumn(nullable: true, onDelete: 'cascade')]
    public ?Comment $parent = null;

    /**
     * The replies left on this comment.
     *
     * @var Collection<int, Comment>
     */
    #[ApiProperty(writable: false, example: '["/comments/1a2b3c4d"]')]
    #[Groups(['read'])]
    #[ORM\OneToMany(targetEntity: self::class, mappedBy: 'parent')]
    #[ORM\OrderBy(['createTime' => 'ASC'])]
    public Collection $children;

    /**
     * The content node this comment is anchored to, for inline (Google-Docs-style)
     * comments. Null for plain activity-level comments. Only set on the root comment
     * of a thread; replies inherit the anchor from their parent.
     */
    #[AssertBelongsToSameCamp]
    #[Assert\Expression(
        'this.contentNode === null or this.activity === null or this.contentNode.root === this.activity.rootContentNode',
        message: 'The content node must belong to the same activity as the comment.',
    )]
    #[Assert\Expression(
        '(this.contentNode === null) === (this.anchorId === null)',
        message: 'contentNode and anchorId must be set together.',
    )]
    #[ApiProperty(example: '/content_node/single_texts/1a2b3c4d')]
    // Updatable so an orphaned thread can be re-anchored, possibly to a
    // different content node of the same activity.
    #[Groups(['read', 'create', 'update'])]
    #[ORM\ManyToOne(targetEntity: ContentNode::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'cascade')]
    public ?ContentNode $contentNode = null;

    /**
     * The id of the TipTap comment mark (span[data-comment-id]) in the content node's
     * rich text that anchors this thread. Null for plain activity-level comments.
     */
    #[Assert\Length(max: 36)]
    #[ApiProperty(example: 'c1a2b3c4d5e6')]
    #[Groups(['read', 'create'])]
    #[ORM\Column(type: 'string', length: 36, nullable: true)]
    public ?string $anchorId = null;

    /**
     * A plain-text snapshot of the text this thread was anchored to, taken when the
     * comment was created. Shown as a quote in the comments panel and used to
     * re-anchor the thread when its mark got lost (e.g. through concurrent edits).
     * Null for plain activity-level comments and replies.
     */
    #[InputFilter\Trim]
    #[InputFilter\CleanText]
    #[Assert\Length(max: 255)]
    #[ApiProperty(example: 'the sentence that was commented on')]
    // Updatable so re-anchoring a thread can refresh the snapshot of its text.
    #[Groups(['read', 'create', 'update'])]
    #[ORM\Column(type: 'text', nullable: true)]
    public ?string $anchorText = null;

    /**
     * When the thread was resolved, or null if it is still open.
     */
    #[ApiProperty(writable: false, example: '2022-01-01T00:00:00+00:00')]
    #[Groups(['read'])]
    #[ORM\Column(type: 'datetime', nullable: true)]
    public ?\DateTimeInterface $resolvedAt = null;

    /**
     * The user who resolved the thread, or null if it is still open.
     */
    #[Assert\DisableAutoMapping]
    #[ApiProperty(writable: false, example: '/users/1a2b3c4d')]
    #[Groups(['read'])]
    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'set null')]
    public ?User $resolvedBy = null;

    /**
     * Virtual, write-only flag used to resolve (true) or reopen (false) a thread
     * via PATCH. The CommentUpdateProcessor translates it into resolvedAt/resolvedBy.
     */
    #[ApiProperty(readable: false, example: true)]
    #[Groups(['update'])]
    public ?bool $resolved = null;

    /**
     * When the comment text was last edited after posting, or null if never.
     * Maintained by the CommentUpdateProcessor; the generic updateTime is not
     * usable for this because resolving a thread also bumps it.
     */
    #[ApiProperty(writable: false, example: '2022-01-02T00:00:00+00:00')]
    #[Groups(['read'])]
    #[ORM\Column(type: 'datetime', nullable: true)]
    public ?\DateTimeInterface $editedAt = null;

    /**
     * Persisted description of the context where the comment was originally writen.
     * Only non-null when activity pointer is null, i.e. activity was deleted.
     * Currently defined as the title of the activity when it was deleted.
     */
    #[InputFilter\Trim]
    #[InputFilter\CleanText]
    #[Assert\Length(max: 32)]
    #[ApiProperty(writable: false, example: 'Sportolympiade')]
    #[Groups(['read', 'create'])]
    #[ORM\Column(type: 'text', nullable: true)]
    public ?string $orphanDescription = null;

    public function __construct() {
        parent::__construct();
        $this->children = new ArrayCollection();
    }

    public function getCamp(): ?Camp {
        return $this->camp;
    }

    #[ApiProperty(writable: false)]
    #[Groups(['read'])]
    public function getCreateTime(): \DateTime {
        return $this->createTime;
    }
}
