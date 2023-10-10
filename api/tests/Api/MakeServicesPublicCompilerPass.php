<?php

namespace App\Tests\Api;

use Symfony\Component\DependencyInjection\Compiler\CompilerPassInterface;
use Symfony\Component\DependencyInjection\ContainerBuilder;

class MakeServicesPublicCompilerPass implements CompilerPassInterface {
    public const SERVICES_TO_MAKE_PUBLIC = [
        'api_platform.openapi.factory',
        'api_platform.openapi.normalizer.api_gateway',
    ];

    public function process(ContainerBuilder $container): void {
        $public_services_map = array_fill_keys(self::SERVICES_TO_MAKE_PUBLIC, true);
        $definitions = $container->getDefinitions();
        foreach ($definitions as $name => $definition) {
            if (isset($public_services_map[$name])) {
                $definition->setPublic(true);
            }
        }
    }
}
