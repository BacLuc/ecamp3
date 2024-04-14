<?php

namespace App\Util;

use App\Entity\Activity;
use App\Entity\BelongsToCampInterface;
use App\Entity\BelongsToContentNodeTreeInterface;
use App\Entity\Camp;
use App\Entity\Category;
use Doctrine\ORM\EntityManagerInterface;

trait GetCampFromContentNodeTrait {
    private function getCampFromInterface(mixed $subject, EntityManagerInterface $em): ?Camp {
        if ($subject instanceof BelongsToCampInterface) {
            return $subject->getCamp();
        }

        if ($subject instanceof BelongsToContentNodeTreeInterface) {
            return $this->getCampFromContentNode($subject, $em);
        }

        return null;
    }

    private function getCampFromContentNode(BelongsToContentNodeTreeInterface $subject, EntityManagerInterface $em): ?Camp {
        $rootContentNode = $subject->getRoot();

        $activity = $em
            ->getRepository(Activity::class)
            ->findOneBy(['rootContentNode' => $rootContentNode])
        ;

        if (null !== $activity) {
            return $activity->getCamp();
        }

        $category = $em
            ->getRepository(Category::class)
            ->findOneBy(['rootContentNode' => $rootContentNode])
        ;

        if (null !== $category) {
            return $category->getCamp();
        }

        return null;
    }
}
