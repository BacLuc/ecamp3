<?php

namespace App\State\ContentNode;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\Metadata\Post;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\ContentNode\Storyboard;
use App\InputFilter\CleanHTMLFilter;
use App\InputFilter\CleanTextFilter;
use Ramsey\Uuid\Uuid;

/**
 * @template-extends ContentNodePersistProcessor<Storyboard>
 */
class StoryboardPersistProcessor extends ContentNodePersistProcessor {
    public function __construct(
        ProcessorInterface $decorated,
        private readonly CleanHTMLFilter $cleanHTMLFilter,
        private readonly CleanTextFilter $cleanTextFilter
    ) {
        parent::__construct($decorated);
    }

    /**
     * @param Storyboard $data
     */
    #[\Override]
    public function onBefore($data, Operation $operation, array $uriVariables = [], array $context = []): Storyboard {
        $data = parent::onBefore($data, $operation, $uriVariables, $context);

        if ($operation instanceof Post && null === $data->data) {
            $data->data = ['sections' => [
                Uuid::uuid4()->toString() => [
                    'column1' => '',
                    'column2Html' => '',
                    'column3' => '',
                    'column4' => '',
                    'position' => 0,
                ],
            ]];
        }

        return $this->sanitizeData($data);
    }

    private function sanitizeData($data) {
        foreach ($data->data['sections'] as &$section) {
            $section = $this->cleanTextFilter->applyTo($section, 'column1');
            $section = $this->cleanHTMLFilter->applyTo($section, 'column2Html');
            $section = $this->cleanTextFilter->applyTo($section, 'column3');
            $section = $this->cleanTextFilter->applyTo($section, 'column4');
        }

        return $data;
    }
}
