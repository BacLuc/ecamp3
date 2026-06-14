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
class ActivityItemProvider implements ProviderInterface {
    public function __construct(
        private readonly ProviderInterface $decorated,
        private readonly EntityManagerInterface $em
    ) {}

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): array|object|null {
        $result = $this->decorated->provide($operation, $uriVariables, $context);

        if ($result instanceof Activity) {
            $this->preloadPeriodData($result);
        }

        return $result;
    }

    private function preloadPeriodData(Activity $activity): void {
        // camp is a lazy proxy on Activity; getId() returns the FK without triggering load
        $campId = $activity->camp?->getId();
        if (null === $campId) {
            return;
        }

        // Batch-load Camp.periods and Period.days so that serializing the embedded
        // ScheduleEntries does not trigger N+1 lazy loads from getDayNumber/getFirstDayNumber.
        $this->em->createQueryBuilder()
            ->select('c, p, d')
            ->from(Camp::class, 'c')
            ->leftJoin('c.periods', 'p')
            ->leftJoin('p.days', 'd')
            ->where('c.id = :id')
            ->setParameter('id', $campId)
            ->getQuery()
            ->getResult()
        ;

        // Collect period IDs from the activity's schedule entries.
        // Accessing scheduleEntries triggers one collection load (period is EAGER on ScheduleEntry,
        // so periods are already joined into that single query).
        $periodIds = [];
        foreach ($activity->scheduleEntries as $scheduleEntry) {
            $periodId = $scheduleEntry->period?->getId();
            if (null !== $periodId) {
                $periodIds[$periodId] = true;
            }
        }

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
