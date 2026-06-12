<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\Comment;
use App\Entity\User;
use App\State\Util\AbstractPersistProcessor;
use App\State\Util\PropertyChangeListener;
use Symfony\Bundle\SecurityBundle\Security;

/**
 * Handles PATCHing a comment. The write-only `resolved` flag is translated into
 * the resolvedAt / resolvedBy fields, stamping the current user and time when a
 * thread is resolved. Edits to the comment text stamp editedAt, so the frontend
 * can show an "edited" indicator (the generic updateTime is useless for that,
 * since resolving bumps it too).
 *
 * @template-extends AbstractPersistProcessor<Comment>
 */
class CommentUpdateProcessor extends AbstractPersistProcessor {
    public function __construct(ProcessorInterface $decorated, private readonly Security $security) {
        $textHtmlChangeListener = PropertyChangeListener::of(
            extractProperty: fn (Comment $data) => $data->textHtml,
            beforeAction: $this->onBeforeTextHtmlChange(...),
        );

        parent::__construct($decorated, propertyChangeListeners: [$textHtmlChangeListener]);
    }

    /**
     * @param Comment $data
     */
    #[\Override]
    public function onBefore($data, Operation $operation, array $uriVariables = [], array $context = []): Comment {
        if (true === $data->resolved && null === $data->resolvedAt) {
            /** @var User $user */
            $user = $this->security->getUser();
            $data->resolvedAt = new \DateTime();
            $data->resolvedBy = $user;
        } elseif (false === $data->resolved) {
            $data->resolvedAt = null;
            $data->resolvedBy = null;
        }

        return $data;
    }

    public function onBeforeTextHtmlChange(Comment $data): Comment {
        $data->editedAt = new \DateTime();

        return $data;
    }
}
