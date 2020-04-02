<?php

namespace eCamp\Core\Hydrator;

use eCamp\Core\Entity\Period;
use eCamp\Lib\Entity\EntityLink;
use eCamp\Lib\Entity\EntityLinkCollection;
use eCamp\Lib\Hydrator\Util;
use eCampApi\V1\Rest\Day\DayCollection;
use eCampApi\V1\Rest\EventInstance\EventInstanceCollection;
use Zend\Hydrator\HydratorInterface;

class PeriodHydrator implements HydratorInterface {
    public static function HydrateInfo() {
        return [
            'days' => Util::Collection(function (Period $p) {
                return new DayCollection($p->getDays());
            }),
            'event_instances' => Util::Collection(function (Period $p) {
                return new EventInstanceCollection($p->getEventInstances());
            })
        ];
    }

    /**
     * @param object $object
     * @return array
     */
    public function extract($object) {
        /** @var Period $period */
        $period = $object;
        return [
            'id' => $period->getId(),
            'description' => $period->getDescription(),
            'start' => Util::extractDate($period->getStart()),
            'end' => Util::extractDate($period->getEnd()),

            'camp' => EntityLink::Create($period->getCamp()),
            'days' => new EntityLinkCollection($period->getDays()),
            'event_instances' => new EntityLinkCollection($period->getEventInstances())
        ];
    }

    /**
     * @param array $data
     * @param object $object
     * @return object
     */
    public function hydrate(array $data, $object) {
        /** @var Period $period */
        $period = $object;

        $start = Util::parseDate($data['start']);
        $end = Util::parseDate($data['end']);

        $period->setDescription($data['description']);
        $period->setStart($start);
        $period->setEnd($end);

        return $period;
    }
}