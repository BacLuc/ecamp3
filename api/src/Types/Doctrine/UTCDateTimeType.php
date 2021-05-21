<?php

namespace App\Types\Doctrine;

use DateTime;
use DateTimeZone;
use Doctrine\DBAL\Types\DateTimeType;
use Doctrine\DBAL\Platforms\AbstractPlatform;
use Doctrine\DBAL\Types\ConversionException;

class UTCDateTimeType extends DateTimeType {
    static private ?DateTimeZone $utc = null;

    /**
     * {@inheritdoc}
     */
    public function convertToDatabaseValue($value, AbstractPlatform $platform) {
        if(null === $value) {
            return null;
        }

        $value->setTimeZone(self::getUtc());

        return $value->format($platform->getDateTimeFormatString());
    }

    /**
     * {@inheritdoc}
     * @throws ConversionException
     */
    public function convertToPHPValue($value, AbstractPlatform $platform) {
        if($value === null) {
            return null;
        }

        $val = DateTime::createFromFormat($platform->getDateTimeFormatString(), $value, self::getUtc());

        if(!$val) {
            throw ConversionException::conversionFailedFormat(
                $value,
                $this->getName(),
                $platform->getDateTimeFormatString()
            );
        }

        return $val;
    }

    private static function getUtc(): DateTimeZone {
        return self::$utc ?: self::$utc = new DateTimeZone('UTC');
    }
}
