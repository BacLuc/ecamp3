<?php

namespace App\Tests\State;

use ApiPlatform\Metadata\Patch;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\User;
use App\Service\ClaimInvitationService;
use App\State\UserActivateProcessor;
use PHPUnit\Framework\TestCase;
use Symfony\Component\PasswordHasher\Hasher\PasswordHasherFactoryInterface;
use Symfony\Component\PasswordHasher\PasswordHasherInterface;

/**
 * @internal
 */
class UserActivateProcessorTest extends TestCase {
    private UserActivateProcessor $processor;
    private PasswordHasherInterface $activationKeyHasher;
    private User $user;

    /**
     * @throws \ReflectionException
     */
    protected function setUp(): void {
        $this->user = new User();

        $this->activationKeyHasher = $this->createMock(PasswordHasherInterface::class);
        $pwHasherFactory = $this->createMock(PasswordHasherFactoryInterface::class);
        $pwHasherFactory->method('getPasswordHasher')->willReturn($this->activationKeyHasher);

        $decoratedProcessor = $this->createStub(ProcessorInterface::class);
        $this->processor = new UserActivateProcessor(
            $decoratedProcessor,
            $this->createStub(ClaimInvitationService::class),
            $pwHasherFactory,
        );
    }

    public function testThrowsIfActivationKeyIsWrongForOnActivate() {
        $this->user->activationKey = 'activation key';
        $this->user->activationKeyHash = 'wrong hash';
        $this->activationKeyHasher->method('verify')->willReturn(false);

        $this->expectException(\Exception::class);
        $this->processor->onBefore($this->user, new Patch());
    }

    /**
     * @throws \Exception
     */
    public function testActivatesUserIfActivationKeyIsCorrect() {
        $this->user->activationKey = 'activation key';
        $this->user->activationKeyHash = 'correct hash';
        $this->activationKeyHasher->method('verify')->willReturn(true);

        $activatedUser = $this->processor->onBefore($this->user, new Patch());
        self::assertThat($activatedUser->state, self::equalTo(User::STATE_ACTIVATED));
        self::assertThat($activatedUser->activationKeyHash, self::isNull());
        self::assertThat($activatedUser->activationKey, self::isNull());
    }
}
