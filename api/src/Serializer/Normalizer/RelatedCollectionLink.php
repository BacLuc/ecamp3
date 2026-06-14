<?php

declare(strict_types=1);

namespace App\Serializer\Normalizer;

#[\Attribute(\Attribute::TARGET_METHOD)]
class RelatedCollectionLink {
    public function __construct(
        protected string $relatedEntity,
        protected array $params = [],
        protected ?string $uriTemplate = null,
        protected ?string $queryTemplate = null,
    ) {}

    public function getRelatedEntity(): string {
        return $this->relatedEntity;
    }

    public function getParams(): array {
        return $this->params;
    }

    public function getUriTemplate(): ?string {
        return $this->uriTemplate;
    }

    public function getQueryTemplate(): ?string {
        return $this->queryTemplate;
    }
}
