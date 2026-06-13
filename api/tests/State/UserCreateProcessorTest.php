<?php

namespace App\Tests\State;

use ApiPlatform\Metadata\Post;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\User;
use App\Security\ReCaptcha\ReCaptchaWrapper;
use App\Service\MailService;
use App\State\UserCreateProcessor;
use PHPUnit\Framework\Attributes\AllowMockObjectsWithoutExpectations;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use ReCaptcha\Response;
use Symfony\Component\PasswordHasher\Hasher\PasswordHasherFactoryInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasher;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\PasswordHasher\PasswordHasherInterface;

/**
 * @internal
 */
class UserCreateProcessorTest extends TestCase {
    private UserCreateProcessor $processor;
    private MockObject|Response $recaptchaResponse;
    private MockObject|UserPasswordHasherInterface $userPasswordHasher;
    private MailService|MockObject $mailService;
    private MockObject|PasswordHasherInterface $activationKeyHasher;
    private User $user;

    /**
     * @throws \ReflectionException
     */
    protected function setUp(): void {
        $this->user = new User();

        $this->recaptchaResponse = $this->createMock(Response::class);
        $recaptcha = $this->createMock(ReCaptchaWrapper::class);
        $recaptcha->method('verify')->willReturn($this->recaptchaResponse);

        $this->userPasswordHasher = $this->createMock(UserPasswordHasher::class);
        $this->mailService = $this->createMock(MailService::class);
        $this->activationKeyHasher = $this->createMock(PasswordHasherInterface::class);
        $pwHasherFactory = $this->createMock(PasswordHasherFactoryInterface::class);
        $pwHasherFactory->method('getPasswordHasher')->willReturn($this->activationKeyHasher);
        $decoratedProcessor = $this->createStub(ProcessorInterface::class);
        $this->processor = new UserCreateProcessor(
            $decoratedProcessor,
            $recaptcha,
            $this->userPasswordHasher,
            $this->mailService,
            $pwHasherFactory,
        );
    }

    #[AllowMockObjectsWithoutExpectations]
    public function testCreateRequiresReCaptcha() {
        $this->recaptchaResponse->expects(self::once())
            ->method('isSuccess')
            ->willReturn(false)
        ;

        $this->expectException(\Exception::class);
        $this->processor->onBefore($this->user, new Post());
    }

    #[AllowMockObjectsWithoutExpectations]
    public function testDoesNotHashWhenNoPasswordIsSet() {
        // given
        $this->recaptchaResponse->expects(self::once())
            ->method('isSuccess')
            ->willReturn(true)
        ;
        $this->userPasswordHasher->expects($this->never())->method('hashPassword');

        // when
        $data = $this->processor->onBefore($this->user, new Post());

        // then
        $this->assertNull($data->password);
        $this->assertNull($data->plainPassword);
    }

    #[AllowMockObjectsWithoutExpectations]
    public function testHashesPasswordWhenPlainPasswordIsSet() {
        // given
        $this->recaptchaResponse->expects(self::once())
            ->method('isSuccess')
            ->willReturn(true)
        ;
        $this->user->plainPassword = 'test plain password';
        $this->userPasswordHasher->expects($this->once())->method('hashPassword')->willReturn('test hash');

        // when
        $data = $this->processor->onBefore($this->user, new Post());

        // then
        $this->assertEquals('test hash', $data->password);
        $this->assertNull($data->plainPassword);
    }

    #[AllowMockObjectsWithoutExpectations]
    public function testCreateAndSendActivationKey() {
        // given
        $this->recaptchaResponse->expects(self::once())
            ->method('isSuccess')
            ->willReturn(true)
        ;
        $this->activationKeyHasher->method('hash')->willReturn('hashed activation key');
        $this->mailService->expects($this->once())->method('sendUserActivationMail');

        // when
        $data = $this->processor->onBefore($this->user, new Post());
        $this->processor->onAfter($this->user, new Post());

        // then
        $this->assertNotNull($data->activationKeyHash);
    }

    #[AllowMockObjectsWithoutExpectations]
    public function testSetsStateToRegisteredBeforeCreate() {
        // when
        $this->recaptchaResponse->expects(self::once())
            ->method('isSuccess')
            ->willReturn(true)
        ;

        $data = $this->processor->onBefore($this->user, new Post());

        // then
        self::assertThat($data->state, self::equalTo(User::STATE_REGISTERED));
    }
}
