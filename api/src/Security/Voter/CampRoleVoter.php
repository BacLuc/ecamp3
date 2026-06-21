<?php

namespace App\Security\Voter;

use App\Entity\BelongsToCampInterface;
use App\Entity\BelongsToContentNodeTreeInterface;
use App\Entity\CampCollaboration;
use App\Entity\User;
use App\HttpCache\ResponseTagger;
use App\Util\GetCampFromContentNodeTrait;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Vote;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

/**
 * @extends Voter<string,BelongsToCampInterface|BelongsToContentNodeTreeInterface>
 */
class CampRoleVoter extends Voter {
    use GetCampFromContentNodeTrait;

    public const RULE_MAPPING = [
        'CAMP_GUEST' => [CampCollaboration::ROLE_GUEST],
        // A contributor has the same read & write rights as a member, so it is granted
        // wherever CAMP_MEMBER is required (e.g. editing activities, materials, schedule).
        'CAMP_MEMBER' => [CampCollaboration::ROLE_MEMBER, CampCollaboration::ROLE_CONTRIBUTOR],
        'CAMP_MANAGER' => [CampCollaboration::ROLE_MANAGER],
        // Changing who is responsible for an activity or day (the "Verantwortliche") is
        // restricted to members and managers; contributors are intentionally excluded.
        'CAMP_MANAGE_RESPONSIBLES' => [CampCollaboration::ROLE_MEMBER, CampCollaboration::ROLE_MANAGER],
        // Changing the timing/position of a schedule entry (moving activities around in the
        // schedule) is restricted to members and managers; contributors are excluded.
        'CAMP_MANAGE_SCHEDULE_ENTRIES' => [CampCollaboration::ROLE_MEMBER, CampCollaboration::ROLE_MANAGER],
        'CAMP_COLLABORATOR' => CampCollaboration::VALID_ROLES,
    ];

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly ResponseTagger $responseTagger
    ) {}

    protected function supports($attribute, $subject): bool {
        return in_array($attribute, array_keys(self::RULE_MAPPING))
            && ($subject instanceof BelongsToCampInterface || $subject instanceof BelongsToContentNodeTreeInterface);
    }

    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token, ?Vote $vote = null): bool {
        $user = $token->getUser();
        if (!$user instanceof User) {
            return false;
        }

        $camp = $this->getCampFromInterface($subject, $this->em);

        if (null === $camp) {
            return false;
        }

        $campCollaboration = $camp->collaborations
            ->filter(self::withStatus(CampCollaboration::STATUS_ESTABLISHED))
            ->filter(self::ofUser($user))
            ->filter(self::withRole($attribute))
            ->first()
        ;

        if ($campCollaboration) {
            $this->responseTagger->addTags([$campCollaboration->getId()]);

            return true;
        }

        return false;
    }

    private static function withStatus($status) {
        return function (CampCollaboration $collaboration) use ($status) {
            return $status === $collaboration->status;
        };
    }

    private static function ofUser($user) {
        return function (CampCollaboration $collaboration) use ($user) {
            return $collaboration->user->getId() === $user->getId();
        };
    }

    private static function withRole($attribute) {
        return function (CampCollaboration $collaboration) use ($attribute) {
            return in_array($collaboration->role, self::RULE_MAPPING[$attribute], true);
        };
    }
}
