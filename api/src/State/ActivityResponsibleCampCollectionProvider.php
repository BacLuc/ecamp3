<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\Entity\ActivityResponsible;
use Symfony\Component\HttpFoundation\RequestStack;

/**
 * @template-implements ProviderInterface<ActivityResponsible>
 */
class ActivityResponsibleCampCollectionProvider implements ProviderInterface {
    public function __construct(
        private readonly ProviderInterface $decorated,
        private readonly RequestStack $requestStack
    ) {}

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): array|object|null {
        $request = $this->requestStack->getCurrentRequest();

        if (isset($uriVariables['campId'])) {
            $request?->query->set('activity.camp', '/camps/'.$uriVariables['campId']);
        }

        return $this->decorated->provide($operation, $uriVariables, $context);
    }
}
