<?php

declare(strict_types=1);

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\Entity\Day;
use App\Entity\Period;
use Doctrine\ORM\EntityManagerInterface;

/**
 * @template-implements ProviderInterface<Day>
 */
class DayItemProvider implements ProviderInterface {
    public function __construct(
        private readonly ProviderInterface $decorated,
        private readonly EntityManagerInterface $em
    ) {}

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): array|object|null {
        $result = $this->decorated->provide($operation, $uriVariables, $context);

        if (!$result instanceof Day) {
            return $result;
        }

        // period is a lazy proxy on Day; getId() returns the FK without triggering load
        $periodId = $result->period?->getId();
        if (null === $periodId) {
            return $result;
        }

        // Pre-populate the identity map with the period, its camp, all sibling periods,
        // and all their days in a single query. This avoids N+1 lazy loads from:
        // - Day::getDayNumber() -> Period::getFirstDayNumber() which accesses
        //   camp.periods and each period's days.count()
        // - Day::getStart()/getEnd() which access period.start
        $this->em->createQueryBuilder()
            ->select('p, c, sibPeriod, d')
            ->from(Period::class, 'p')
            ->leftJoin('p.camp', 'c')
            ->leftJoin('c.periods', 'sibPeriod')
            ->leftJoin('sibPeriod.days', 'd')
            ->where('p.id = :id')
            ->setParameter('id', $periodId)
            ->getQuery()
            ->getResult()
        ;

        // Load Period.scheduleEntries for Day::getScheduleEntries() which filters
        // all schedule entries of the period that overlap with this day.
        $this->em->createQueryBuilder()
            ->select('p, s')
            ->from(Period::class, 'p')
            ->leftJoin('p.scheduleEntries', 's')
            ->where('p.id = :id')
            ->setParameter('id', $periodId)
            ->getQuery()
            ->getResult()
        ;

        return $result;
    }
}
