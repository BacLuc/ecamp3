<?php

namespace App\Tests\Security\Voter;

use App\Entity\Activity;
use App\Entity\BaseEntity;
use App\Entity\BelongsToContentNodeTreeInterface;
use App\Entity\Camp;
use App\Entity\CampCollaboration;
use App\Entity\ContentNode\ColumnLayout;
use App\Entity\Period;
use App\Entity\User;
use App\HttpCache\ResponseTagger;
use App\Security\Voter\CampRoleVoter;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\EntityRepository;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\VoterInterface;

/**
 * @internal
 */
class CampRoleVoterTest extends TestCase {
    private CampRoleVoter $voter;
    private MockObject|TokenInterface $token;
    private EntityManagerInterface|MockObject $em;
    private MockObject|ResponseTagger $responseTagger;

    public function setUp(): void {
        parent::setUp();
        $this->token = $this->createStub(TokenInterface::class);
        $this->em = $this->createStub(EntityManagerInterface::class);
        $this->responseTagger = $this->createStub(ResponseTagger::class);
        $this->voter = new CampRoleVoter($this->em, $this->responseTagger);
    }

    public function testDoesntVoteWhenAttributeWrong() {
        // given

        // when
        $result = $this->voter->vote($this->token, new Period(), ['CAMP_SUPPORTER']);

        // then
        $this->assertSame(VoterInterface::ACCESS_ABSTAIN, $result);
    }

    public function testDoesntVoteWhenSubjectDoesNotBelongToCamp() {
        // given

        // when
        $result = $this->voter->vote($this->token, new CampRoleVoterTestDummy(), ['CAMP_COLLABORATOR']);

        // then
        $this->assertSame(VoterInterface::ACCESS_ABSTAIN, $result);
    }

    public function testDoesntVoteWhenSubjectIsNull() {
        // given

        // when
        $result = $this->voter->vote($this->token, null, ['CAMP_COLLABORATOR']);

        // then
        $this->assertSame(VoterInterface::ACCESS_ABSTAIN, $result);
    }

    public function testDeniesAccessWhenNotLoggedIn() {
        // given
        $this->token->method('getUser')->willReturn(null);

        // when
        $result = $this->voter->vote($this->token, new Period(), ['CAMP_COLLABORATOR']);

        // then
        $this->assertSame(VoterInterface::ACCESS_DENIED, $result);
    }

    public function testDeniesAccessWhenGetCampYieldsNull() {
        // given
        $this->token->method('getUser')->willReturn(new User());
        $subject = $this->createStub(Period::class);
        $subject->method('getCamp')->willReturn(null);

        // when
        $result = $this->voter->vote($this->token, $subject, ['CAMP_COLLABORATOR']);

        // then
        $this->assertSame(VoterInterface::ACCESS_DENIED, $result);
    }

    public function testDeniesAccessWhenGetCampYieldsNullAndNotLoggedIn() {
        // given
        $this->token->method('getUser')->willReturn(null);
        $subject = $this->createStub(Period::class);
        $subject->method('getCamp')->willReturn(null);

        // when
        $result = $this->voter->vote($this->token, $subject, ['CAMP_COLLABORATOR']);

        // then
        $this->assertSame(VoterInterface::ACCESS_DENIED, $result);
    }

    public function testDeniesAccessWhenNoCampCollaborations() {
        // given
        $user = $this->createStub(User::class);
        $user->method('getId')->willReturn('idFromTest');
        $this->token->method('getUser')->willReturn($user);
        $camp = new Camp();
        $subject = $this->createStub(Period::class);
        $subject->method('getCamp')->willReturn($camp);

        // when
        $result = $this->voter->vote($this->token, $subject, ['CAMP_COLLABORATOR']);

        // then
        $this->assertSame(VoterInterface::ACCESS_DENIED, $result);
    }

    public function testDeniesAccessWhenNoMatchingCampCollaboration() {
        // given
        $user = $this->createStub(User::class);
        $user->method('getId')->willReturn('idFromTest');
        $user2 = $this->createStub(User::class);
        $user2->method('getId')->willReturn('otherIdFromTest');
        $this->token->method('getUser')->willReturn($user);
        $collaboration = new CampCollaboration();
        $collaboration->user = $user2;
        $collaboration->status = CampCollaboration::STATUS_ESTABLISHED;
        $collaboration->role = CampCollaboration::ROLE_MANAGER;
        $camp = new Camp();
        $camp->collaborations->add($collaboration);
        $subject = $this->createStub(Period::class);
        $subject->method('getCamp')->willReturn($camp);

        // when
        $result = $this->voter->vote($this->token, $subject, ['CAMP_COLLABORATOR']);

        // then
        $this->assertSame(VoterInterface::ACCESS_DENIED, $result);
    }

    public function testDeniesAccessWhenMatchingCampCollaborationIsInvitation() {
        // given
        $user = $this->createStub(User::class);
        $user->method('getId')->willReturn('idFromTest');
        $user2 = $this->createStub(User::class);
        $user2->method('getId')->willReturn('idFromTest');
        $this->token->method('getUser')->willReturn($user);
        $collaboration = new CampCollaboration();
        $collaboration->user = $user2;
        $collaboration->status = CampCollaboration::STATUS_INVITED;
        $collaboration->role = CampCollaboration::ROLE_MANAGER;
        $camp = new Camp();
        $camp->collaborations->add($collaboration);
        $subject = $this->createStub(Period::class);
        $subject->method('getCamp')->willReturn($camp);

        // when
        $result = $this->voter->vote($this->token, $subject, ['CAMP_COLLABORATOR']);

        // then
        $this->assertSame(VoterInterface::ACCESS_DENIED, $result);
    }

    public function testDeniesAccessWhenMatchingCampCollaborationIsInactive() {
        // given
        $user = $this->createStub(User::class);
        $user->method('getId')->willReturn('idFromTest');
        $user2 = $this->createStub(User::class);
        $user2->method('getId')->willReturn('idFromTest');
        $this->token->method('getUser')->willReturn($user);
        $collaboration = new CampCollaboration();
        $collaboration->user = $user2;
        $collaboration->status = CampCollaboration::STATUS_INACTIVE;
        $collaboration->role = CampCollaboration::ROLE_MANAGER;
        $camp = new Camp();
        $camp->collaborations->add($collaboration);
        $subject = $this->createStub(Period::class);
        $subject->method('getCamp')->willReturn($camp);

        // when
        $result = $this->voter->vote($this->token, $subject, ['CAMP_COLLABORATOR']);

        // then
        $this->assertSame(VoterInterface::ACCESS_DENIED, $result);
    }

    public function testDeniesAccessWhenRolesDontMatch() {
        // given
        $user = $this->createStub(User::class);
        $user->method('getId')->willReturn('idFromTest');
        $user2 = $this->createStub(User::class);
        $user2->method('getId')->willReturn('idFromTest');
        $this->token->method('getUser')->willReturn($user);
        $collaboration = new CampCollaboration();
        $collaboration->user = $user2;
        $collaboration->status = CampCollaboration::STATUS_ESTABLISHED;
        $collaboration->role = CampCollaboration::ROLE_GUEST;
        $camp = new Camp();
        $camp->collaborations->add($collaboration);
        $subject = $this->createStub(Period::class);
        $subject->method('getCamp')->willReturn($camp);

        // when
        $result = $this->voter->vote($this->token, $subject, ['CAMP_MANAGER']);

        // then
        $this->assertSame(VoterInterface::ACCESS_DENIED, $result);
    }

    public function testGrantsAccessViaBelongsToCampInterface() {
        // given
        $user = $this->createStub(User::class);
        $user->method('getId')->willReturn('idFromTest');
        $user2 = $this->createStub(User::class);
        $user2->method('getId')->willReturn('idFromTest');
        $this->token->method('getUser')->willReturn($user);
        $collaboration = new CampCollaboration();
        $collaboration->user = $user2;
        $collaboration->status = CampCollaboration::STATUS_ESTABLISHED;
        $collaboration->role = CampCollaboration::ROLE_MANAGER;
        $camp = new Camp();
        $camp->collaborations->add($collaboration);
        $subject = $this->createStub(Period::class);
        $subject->method('getCamp')->willReturn($camp);

        $this->responseTagger = $this->createMock(ResponseTagger::class);
        $this->responseTagger->expects($this->once())->method('addTags')->with([$collaboration->getId()]);
        $this->voter = new CampRoleVoter($this->em, $this->responseTagger);

        // when
        $result = $this->voter->vote($this->token, $subject, ['CAMP_COLLABORATOR']);

        // then
        $this->assertSame(VoterInterface::ACCESS_GRANTED, $result);
    }

    public function testGrantsMemberAccessToContributor() {
        // given a contributor has the same read & write rights as a member
        // when
        $result = $this->voteForRole(CampCollaboration::ROLE_CONTRIBUTOR, 'CAMP_MEMBER');

        // then
        $this->assertSame(VoterInterface::ACCESS_GRANTED, $result);
    }

    public function testDeniesManageResponsiblesToContributor() {
        // given a contributor must not change the responsibles ("Verantwortliche")
        // when
        $result = $this->voteForRole(CampCollaboration::ROLE_CONTRIBUTOR, 'CAMP_MANAGE_RESPONSIBLES');

        // then
        $this->assertSame(VoterInterface::ACCESS_DENIED, $result);
    }

    public function testGrantsManageResponsiblesToMember() {
        // when
        $result = $this->voteForRole(CampCollaboration::ROLE_MEMBER, 'CAMP_MANAGE_RESPONSIBLES');

        // then
        $this->assertSame(VoterInterface::ACCESS_GRANTED, $result);
    }

    public function testGrantsManageResponsiblesToManager() {
        // when
        $result = $this->voteForRole(CampCollaboration::ROLE_MANAGER, 'CAMP_MANAGE_RESPONSIBLES');

        // then
        $this->assertSame(VoterInterface::ACCESS_GRANTED, $result);
    }

    public function testDeniesManageScheduleEntriesToContributor() {
        // given a contributor must not move activities around / change their time
        // when
        $result = $this->voteForRole(CampCollaboration::ROLE_CONTRIBUTOR, 'CAMP_MANAGE_SCHEDULE_ENTRIES');

        // then
        $this->assertSame(VoterInterface::ACCESS_DENIED, $result);
    }

    public function testGrantsManageScheduleEntriesToMember() {
        // when
        $result = $this->voteForRole(CampCollaboration::ROLE_MEMBER, 'CAMP_MANAGE_SCHEDULE_ENTRIES');

        // then
        $this->assertSame(VoterInterface::ACCESS_GRANTED, $result);
    }

    public function testGrantsManageScheduleEntriesToManager() {
        // when
        $result = $this->voteForRole(CampCollaboration::ROLE_MANAGER, 'CAMP_MANAGE_SCHEDULE_ENTRIES');

        // then
        $this->assertSame(VoterInterface::ACCESS_GRANTED, $result);
    }

    public function testGrantsAccessViaBelongsToContentNodeTreeInterface() {
        // given
        $user = $this->createStub(User::class);
        $user->method('getId')->willReturn('idFromTest');
        $user2 = $this->createStub(User::class);
        $user2->method('getId')->willReturn('idFromTest');
        $this->token->method('getUser')->willReturn($user);
        $collaboration = new CampCollaboration();
        $collaboration->user = $user2;
        $collaboration->status = CampCollaboration::STATUS_ESTABLISHED;
        $collaboration->role = CampCollaboration::ROLE_MANAGER;
        $camp = new Camp();
        $camp->collaborations->add($collaboration);
        $activity = $this->createStub(Activity::class);
        $activity->method('getCamp')->willReturn($camp);
        $root = $this->createStub(ColumnLayout::class);
        $subject = $this->createStub(ContentNodeTreeDummy2::class);
        $subject->method('getRoot')->willReturn($root);
        $repository = $this->createStub(EntityRepository::class);
        $this->em->method('getRepository')->willReturn($repository);
        $repository->method('findOneBy')->willReturn($activity);

        // when
        $result = $this->voter->vote($this->token, $subject, ['CAMP_COLLABORATOR']);

        // then
        $this->assertSame(VoterInterface::ACCESS_GRANTED, $result);
    }

    private function voteForRole(string $role, string $attribute): int {
        $user = $this->createStub(User::class);
        $user->method('getId')->willReturn('idFromTest');
        $collaborationUser = $this->createStub(User::class);
        $collaborationUser->method('getId')->willReturn('idFromTest');
        $this->token->method('getUser')->willReturn($user);
        $collaboration = new CampCollaboration();
        $collaboration->user = $collaborationUser;
        $collaboration->status = CampCollaboration::STATUS_ESTABLISHED;
        $collaboration->role = $role;
        $camp = new Camp();
        $camp->collaborations->add($collaboration);
        $subject = $this->createStub(Period::class);
        $subject->method('getCamp')->willReturn($camp);

        return $this->voter->vote($this->token, $subject, [$attribute]);
    }
}

class CampRoleVoterTestDummy extends BaseEntity {}

class ContentNodeTreeDummy2 implements BelongsToContentNodeTreeInterface {
    public function getRoot(): ?ColumnLayout {
        return null;
    }
}
