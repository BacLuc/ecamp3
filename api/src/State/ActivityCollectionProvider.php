<?php

declare(strict_types=1);

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\Entity\Activity;
use App\Entity\Camp;
use App\Entity\Period;
use Doctrine\ORM\EntityManagerInterface;

/**
 * @template-implements ProviderInterface<Activity>
 */
class ActivityCollectionProvider implements ProviderInterface {
    public function __construct(
        private readonly ProviderInterface $decorated,
        private readonly EntityManagerInterface $em
    ) {}

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): array|object|null {
        $result = $this->decorated->provide($operation, $uriVariables, $context);
        $this->preloadPeriodData($result);

        return $result;
    }

    private function preloadPeriodData(iterable $activities): void {
        $campIds = [];
        $periodIds = [];
        foreach ($activities as $activity) {
            $campId = $activity->camp?->getId();
            if (null !== $campId) {
                $campIds[$campId] = true;
            }
            foreach ($activity->scheduleEntries as $scheduleEntry) {
                $periodId = $scheduleEntry->period?->getId();
                if (null !== $periodId) {
                    $periodIds[$periodId] = true;
                }
            }
        }

        if (empty($campIds)) {
            return;
        }

        // Batch-initialize Camp.periods and Period.days to avoid N+1 queries during serialization.
        // Period::getFirstDayNumber() accesses camp.periods (to count days in earlier periods)
        // and period.days.count(). ScheduleEntry::getDay() also filters period.days.
        $this->em->createQueryBuilder()
            ->select('c, p, d')
            ->from(Camp::class, 'c')
            ->leftJoin('c.periods', 'p')
            ->leftJoin('p.days', 'd')
            ->where('c.id IN (:ids)')
            ->setParameter('ids', array_keys($campIds))
            ->getQuery()
            ->getResult()
        ;

        if (empty($periodIds)) {
            return;
        }

        // Batch-initialize Period.scheduleEntries to avoid N+1 queries during serialization.
        // ScheduleEntry::getScheduleEntryNumber() filters period.scheduleEntries, which would
        // otherwise trigger one lazy-load query per unique period.
        $this->em->createQueryBuilder()
            ->select('p, s')
            ->from(Period::class, 'p')
            ->leftJoin('p.scheduleEntries', 's')
            ->where('p.id IN (:ids)')
            ->setParameter('ids', array_keys($periodIds))
            ->getQuery()
            ->getResult()
        ;
    }
}
