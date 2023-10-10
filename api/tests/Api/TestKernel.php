<?php

namespace App\Tests\Api;

use App\Kernel;
use Symfony\Component\DependencyInjection\ContainerBuilder;

class TestKernel extends Kernel {
    protected function build(ContainerBuilder $container): void {
        parent::build($container);

        $container->addCompilerPass(new MakeServicesPublicCompilerPass());
    }
}
