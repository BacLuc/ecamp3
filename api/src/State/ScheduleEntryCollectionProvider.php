<?php

declare(strict_types=1);

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\Entity\Activity;
use App\Entity\Camp;
use App\Entity\Period;
use App\Entity\ScheduleEntry;
use Doctrine\ORM\EntityManagerInterface;

/**
 * @template-implements ProviderInterface<ScheduleEntry>
 */
class ScheduleEntryCollectionProvider implements ProviderInterface {
    public function __construct(
        private readonly ProviderInterface $decorated,
        private readonly EntityManagerInterface $em
    ) {}

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): array|object|null {
        $result = $this->decorated->provide($operation, $uriVariables, $context);
        $this->preloadData($result);

        return $result;
    }

    private function preloadData(iterable $scheduleEntries): void {
        $campIds = [];
        $periodIds = [];
        $activityIds = [];

        foreach ($scheduleEntries as $scheduleEntry) {
            // period is fetch: EAGER on ScheduleEntry, so it is already loaded
            $periodId = $scheduleEntry->period?->getId();
            if (null !== $periodId) {
                $periodIds[$periodId] = true;
                // camp is a lazy proxy on period, but getId() returns the FK without triggering load
                $campId = $scheduleEntry->period->camp?->getId();
                if (null !== $campId) {
                    $campIds[$campId] = true;
                }
            }
            // activity is a lazy proxy; getId() returns the FK without triggering load
            $activityId = $scheduleEntry->activity?->getId();
            if (null !== $activityId) {
                $activityIds[$activityId] = true;
            }
        }

        // Batch-load activities with categories to avoid N+1 queries from
        // ScheduleEntry::getNumberingStyle() accessing activity.category.numberingStyle.
        if (!empty($activityIds)) {
            $this->em->createQueryBuilder()
                ->select('a, cat')
                ->from(Activity::class, 'a')
                ->leftJoin('a.category', 'cat')
                ->where('a.id IN (:ids)')
                ->setParameter('ids', array_keys($activityIds))
                ->getQuery()
                ->getResult()
            ;
        }

        if (empty($campIds)) {
            return;
        }

        // Batch-load Camp.periods and Period.days to avoid N+1 queries from
        // ScheduleEntry::getDayNumber() -> Period::getFirstDayNumber() which accesses
        // camp.periods and each sibling period's days.
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

        // Batch-load Period.scheduleEntries to avoid N+1 queries from
        // ScheduleEntry::getScheduleEntryNumber() which filters period.scheduleEntries.
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
