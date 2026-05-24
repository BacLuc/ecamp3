<?php

namespace App\Doctrine\Orm\Extension;

use ApiPlatform\Doctrine\Orm\Extension\QueryCollectionExtensionInterface;
use ApiPlatform\Doctrine\Orm\Util\QueryNameGeneratorInterface;
use ApiPlatform\Metadata\HttpOperation;
use ApiPlatform\Metadata\Operation;
use App\Entity\Camp;
use App\Entity\ChecklistItem;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\QueryBuilder;
use Symfony\Component\HttpFoundation\RequestStack;

final class ChecklistItemCampSubresourceExtension implements QueryCollectionExtensionInterface {
    public function __construct(
        private readonly RequestStack $requestStack,
        private readonly EntityManagerInterface $entityManager,
    ) {}

    public function applyToCollection(QueryBuilder $queryBuilder, QueryNameGeneratorInterface $queryNameGenerator, ?string $resourceClass = null, ?Operation $operation = null, array $context = []): void {
        if (ChecklistItem::class !== $resourceClass) {
            return;
        }

        if (!($operation instanceof HttpOperation) || ChecklistItem::CAMP_SUBRESOURCE_URI_TEMPLATE !== $operation->getUriTemplate()) {
            return;
        }

        $request = $this->requestStack->getCurrentRequest();
        $campId = $request?->attributes->get('campId');

        if (!$campId) {
            return;
        }

        $alias = $queryBuilder->getRootAliases()[0];
        $checklistAlias = $queryNameGenerator->generateJoinAlias('checklist');

        $queryBuilder->innerJoin("{$alias}.checklist", $checklistAlias);
        $queryBuilder->andWhere("{$checklistAlias}.camp = :camp_subresource_camp");
        $queryBuilder->setParameter('camp_subresource_camp', $this->entityManager->getReference(Camp::class, $campId));
    }
}
