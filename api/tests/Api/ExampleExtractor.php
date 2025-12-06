<?php

namespace App\Tests\Api;

use ApiPlatform\Metadata\ApiProperty;

readonly class ExampleExtractor {
    private \ReflectionClass $reflectionClass;

    /**
     * @throws \ReflectionException
     */
    public function __construct(
        string $resourceClass
    ) {
        $this->reflectionClass = new \ReflectionClass($resourceClass);
    }

    /**
     * @throws \ReflectionException
     */
    public function getExampleFor($propertyName, $schemaProperty) {
        if (isset($schemaProperty['example'])) {
            return $schemaProperty['example'];
        }
        $reflectionProperty = $this->reflectionClass->getProperty($propertyName);
        $reflectionAttributes = $reflectionProperty->getAttributes(ApiProperty::class);
        if (empty($reflectionAttributes)) {
            return null;
        }
        if (count($reflectionAttributes) > 1) {
            $apiPropertyClass = ApiProperty::class;

            throw new \RuntimeException("More than one {$apiPropertyClass} annotation found for property {$this->reflectionClass->name}->{$propertyName}");
        }

        return $reflectionAttributes[0]->newInstance()->getExample();
    }
}
