<?php

namespace App\Util;

/**
 * Removes inline-comment anchors (the <span data-comment-id="..."> spans produced
 * by the frontend's TipTap CommentMark) from rich text. Used when content nodes
 * are copied: comment threads are not copied along, so copies must not carry
 * anchors pointing at the original's comments.
 */
class CommentAnchors {
    /**
     * Strip comment anchors from every string inside a content node's data array.
     * Only the comment-related attributes are removed; the span tags themselves are
     * left in place (they are inert without the attribute and get unwrapped by the
     * editor on the next edit). This stays correct even for nested anchor spans
     * (overlapping comments), which a tag-unwrapping regex would corrupt.
     */
    public static function stripFromData(?array $data): ?array {
        if (null === $data) {
            return null;
        }

        array_walk_recursive($data, function (&$value) {
            if (is_string($value)) {
                $value = self::stripFromHtml($value);
            }
        });

        return $data;
    }

    public static function stripFromHtml(string $html): string {
        $html = preg_replace('/\s*data-comment-id="[^"]*"/', '', $html);

        return preg_replace('/\s*class="comment-mark"/', '', $html);
    }
}
