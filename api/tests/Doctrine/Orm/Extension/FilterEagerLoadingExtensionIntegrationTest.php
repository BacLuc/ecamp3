<?php

namespace App\Tests\Doctrine\Orm\Extension;

use ApiPlatform\Doctrine\Orm\Extension\QueryResultCollectionExtensionInterface;
use ApiPlatform\Doctrine\Orm\State\LinksHandlerTrait;
use ApiPlatform\Doctrine\Orm\Util\QueryNameGenerator;
use ApiPlatform\Metadata\Exception\RuntimeException;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Resource\Factory\ResourceMetadataCollectionFactoryInterface;
use App\Doctrine\Orm\Extension\FilterEagerLoadingsExtension;
use App\Entity\Camp;
use App\Repository\CampRepository;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\QueryBuilder;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

class FilterEagerLoadingExtensionIntegrationTest extends KernelTestCase
{
    use LinksHandlerTrait;
    private FilterEagerLoadingsExtension|MockObject $filterEagerLoadingExtension;
    private $campRepository;
    private $queryNameGenerator;
    private $class;
    private $operation;
    private $context;

    public function setUp(): void
    {
        parent::setUp();
        $container = static::getContainer();
        $this->filterEagerLoadingExtension = $container->get(FilterEagerLoadingsExtension::class);

        $this->campRepository = $container->get(CampRepository::class);

        $this->resourceMetadataCollectionFactory = $container->get(ResourceMetadataCollectionFactoryInterface::class);
        $this->queryNameGenerator = new QueryNameGenerator();


        $this->class = Camp::class;
        $this->operation = new GetCollection();
        $this->context = [];
    }

    public function testLetQueryAsIsIfNoCondition() {
        /** @var QueryBuilder $queryBuilder */
        $queryBuilder = $this->campRepository->createQueryBuilder('o');
        $queryBuilder->getQuery()->getSQL();

        $this->applyLinks($queryBuilder);

        $this->applyExtension($queryBuilder);

    }

    /**
     * @param $queryBuilder
     * @return void
     */
    public function applyLinks($queryBuilder): void
    {
        $this->handleLinks(
            queryBuilder: $queryBuilder,
            identifiers: [],
            queryNameGenerator: $this->queryNameGenerator,
            context: $this->context,
            entityClass: $this->class,
            operation: $this->operation
        );
    }

    /**
     * @param $queryBuilder
     * @return void
     */
    public function applyExtension($queryBuilder): void
    {
        $this->filterEagerLoadingExtension->applyToCollection(
            queryBuilder: $queryBuilder,
            queryNameGenerator: $this->queryNameGenerator,
            resourceClass: $this->class,
            operation: $this->operation,
            context: $this->context
        );
    }
}
