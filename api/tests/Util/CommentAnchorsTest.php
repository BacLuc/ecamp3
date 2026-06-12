<?php

namespace App\Tests\Util;

use App\Util\CommentAnchors;
use PHPUnit\Framework\TestCase;

/**
 * @internal
 */
class CommentAnchorsTest extends TestCase {
    public function testStripsAnchorAttributeAndMarkerClassFromHtml() {
        $html = 'one <span class="comment-mark" data-comment-id="7d68c4c2-db9e-465f-84ab-593c50989ad7">two</span> three';

        $result = CommentAnchors::stripFromHtml($html);

        $this->assertSame('one <span>two</span> three', $result);
    }

    public function testStripsNestedAnchorsOfOverlappingThreads() {
        $html = '<p><span class="comment-mark" data-comment-id="outer">a<span class="comment-mark" data-comment-id="inner">b</span>c</span></p>';

        $result = CommentAnchors::stripFromHtml($html);

        $this->assertSame('<p><span>a<span>b</span>c</span></p>', $result);
        $this->assertStringNotContainsString('data-comment-id', $result);
    }

    public function testLeavesUnrelatedMarkupAlone() {
        $html = '<p><b>bold</b> and <span class="other">spans</span> stay</p>';

        $this->assertSame($html, CommentAnchors::stripFromHtml($html));
    }

    public function testStripsFromAllStringsInNestedDataArrays() {
        $data = [
            'html' => 'a <span class="comment-mark" data-comment-id="x">b</span>',
            'sections' => [
                ['column1' => 'c <span data-comment-id="y">d</span>', 'position' => 2],
            ],
        ];

        $result = CommentAnchors::stripFromData($data);

        $this->assertSame('a <span>b</span>', $result['html']);
        $this->assertSame('c <span>d</span>', $result['sections'][0]['column1']);
        $this->assertSame(2, $result['sections'][0]['position']);
    }

    public function testHandlesNull() {
        $this->assertNull(CommentAnchors::stripFromData(null));
    }
}
