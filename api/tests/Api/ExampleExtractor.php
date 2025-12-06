<?php

namespace App\Tests\Api;

use ApiPlatform\Metadata\ApiProperty;
use ReflectionClass;

class ExampleExtractor {
    private readonly ReflectionClass $reflectionClass;

    /**
     * @throws \ReflectionException
     */
    public function __construct(
        string $resourceClass
    ) {
        $this->reflectionClass = new ReflectionClass($resourceClass);
    }

    public function getExampleFor($propertyName, $schemaProperty) {
        if ($schemaProperty['example']) {
            return $schemaProperty['example'];
        }
        $reflectionProperty = $this->reflectionClass->getProperty($propertyName);
        $reflectionAttributes = $reflectionProperty->getAttributes(ApiProperty::class);
        if (empty($reflectionAttributes)) {
            return null;
        }
        return $reflectionAttributes[0]->newInstance()->getExample();
    }
}