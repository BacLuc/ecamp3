<?php

namespace App\Repository;

use ApiPlatform\Doctrine\Orm\Util\QueryNameGeneratorInterface;
use App\Entity\Category;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\ORM\QueryBuilder;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @method null|Category find($id, $lockMode = null, $lockVersion = null)
 * @method null|Category findOneBy(array $criteria, array $orderBy = null)
 * @method Category[]    findAll()
 * @method Category[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class CategoryRepository extends ServiceEntityRepository implements CanFilterByUserInterface, CanFilterByCampInterface {
    use FiltersByCampCollaboration;

    public function __construct(ManagerRegistry $registry) {
        parent::__construct($registry, Category::class);
    }

    public function filterByUser(QueryBuilder $queryBuilder, User $user): void {
        $rootAlias = $queryBuilder->getRootAliases()[0];
        $queryBuilder->innerJoin("{$rootAlias}.camp", 'camp');
        $this->filterByCampCollaboration($queryBuilder, $user);
    }

    public function filterByCamp(QueryBuilder $queryBuilder, QueryNameGeneratorInterface $queryNameGenerator, string $campId): void {
        $rootAlias = $queryBuilder->getRootAliases()[0];
        $queryBuilder->andWhere(
            $queryBuilder->expr()->eq("{$rootAlias}.camp", ':camp')
        );
        $queryBuilder->setParameter('camp', $campId);
    }
}
