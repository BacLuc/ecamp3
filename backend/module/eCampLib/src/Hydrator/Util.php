<?php

namespace eCamp\Lib\Hydrator;

use DateTime;
use eCamp\Lib\Hydrator\Resolver\CollectionLinkResolver;
use eCamp\Lib\Hydrator\Resolver\CollectionResolver;
use eCamp\Lib\Hydrator\Resolver\EntityLinkResolver;
use eCamp\Lib\Hydrator\Resolver\EntityResolver;
use Exception;

class Util {
    /**
     * @param $resolver
     * @param array $selection
     *
     * @return EntityResolver
     */
    public static function Entity($resolver, $selection = []) {
        return new EntityResolver($resolver, null, $selection);
    }

    /**
     * @param $resolver
     *
     * @return EntityLinkResolver
     */
    public static function EntityLink($resolver) {
        return new EntityLinkResolver($resolver, null);
    }

    /**
     * @param $resolver
     * @param array $selection
     * @param mixed $linkResolver
     *
     * @return CollectionResolver
     */
    public static function Collection($resolver, $linkResolver, $selection = []) {
        return new CollectionResolver($resolver, $linkResolver, $selection);
    }

    public static function CollectionLink($resolver, $linkResolver) {
        return new CollectionLinkResolver($resolver, $linkResolver);
    }

    public static function extractDate(?DateTime $date) {
        if (null == $date) {
            return null;
        }

        return $date->format('Y-m-d');
    }

    public static function extractDateTime(?DateTime $date) {
        if (null == $date) {
            return null;
        }

        return $date->format('Y-m-d H:i:s');
    }

    /**
     * @param $date
     *
     * @throws Exception
     *
     * @return null|DateTime
     */
    public static function parseDate($date) {
        $result = null;

        if ($date instanceof DateTime) {
            $result = $date;
        }

        if (is_string($date) && strlen($date) > 0) {
            $result = new DateTime($date);
        }

        return $result;
    }
}
