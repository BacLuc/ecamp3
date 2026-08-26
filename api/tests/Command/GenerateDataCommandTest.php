<?php

namespace App\Tests\Command;

use App\Command\GenerateDataCommand;
use App\Entity\Activity;
use App\Entity\Camp;
use App\Entity\Comment;
use App\Entity\Profile;
use App\Tests\Api\ECampApiTestCase;
use Symfony\Bundle\FrameworkBundle\Console\Application;
use Symfony\Component\Console\Tester\CommandTester;

/**
 * @internal
 */
class GenerateDataCommandTest extends ECampApiTestCase {
    private CommandTester $commandTester;

    public function setUp(): void {
        parent::setUp();

        $application = new Application(self::$kernel);
        $application->setAutoExit(false);
        $command = $application->find(GenerateDataCommand::APP_GENERATE_DATA_COMMAND);
        $this->commandTester = new CommandTester($command);
    }

    public function testGenerateData() {
        /** @var Profile $profile7Manager */
        $profile7Manager = static::getFixture('profile7manager');
        $this->commandTester->execute([
            'num-camps' => '1',
            '--activities-per-camp' => '10',
            '--add-user-to-camp' => $profile7Manager->email,
        ]);

        $this->commandTester->assertCommandIsSuccessful();
        $this->assertStringContainsString('Comments', $this->commandTester->getDisplay());

        $camp = $this->getEntityManager()->getRepository(Camp::class)->findOneBy(['randomlyGenerated' => true], ['createTime' => 'DESC']);
        $activities = $this->getEntityManager()->getRepository(Activity::class)->findBy(['camp' => $camp]);
        $comments = $this->getEntityManager()->getRepository(Comment::class)->findBy(['camp' => $camp], ['createTime' => 'ASC']);

        $this->assertCount(10, $activities);
        $commentedActivityIds = array_unique(array_map(static fn (Comment $comment): string => $comment->activity->getId(), $comments));
        $this->assertCount(2, $commentedActivityIds);
        $this->assertGreaterThanOrEqual(8, count($comments));
        $this->assertLessThanOrEqual(20, count($comments));
        $this->assertNotEmpty(array_filter($comments, static fn (Comment $comment): bool => '' !== trim((string) $comment->textHtml)));

        $commentsByActivity = [];
        foreach ($comments as $comment) {
            $this->assertSame($camp, $comment->activity->camp);
            $this->assertNotNull($comment->author);
            $commentsByActivity[$comment->activity->getId()][] = $comment;
        }
        $this->assertCount(2, $commentsByActivity);
        foreach ($commentsByActivity as $activityComments) {
            $this->assertGreaterThanOrEqual(4, count($activityComments));
            $this->assertLessThanOrEqual(10, count($activityComments));
            foreach ($activityComments as $index => $comment) {
                if (isset($activityComments[$index + 1])) {
                    $this->assertLessThanOrEqual($activityComments[$index + 1]->getCreateTime(), $comment->getCreateTime());
                    $this->assertNotSame($comment->author, $activityComments[$index + 1]->author);
                }
            }
        }
    }

    public function testReplaceGeneratedData() {
        /** @var Profile $profile7Manager */
        $profile7Manager = static::getFixture('profile7manager');
        $this->commandTester->execute([
            'num-camps' => '1',
            '--activities-per-camp' => '10',
            '--add-user-to-camp' => $profile7Manager->email,
            '--replace' => 'true',
        ]);

        $this->commandTester->assertCommandIsSuccessful();

        $this->commandTester->execute([
            'num-camps' => '1',
            '--activities-per-camp' => '10',
            '--add-user-to-camp' => $profile7Manager->email,
            '--replace' => 'true',
        ]);

        $this->commandTester->assertCommandIsSuccessful();
    }
}
