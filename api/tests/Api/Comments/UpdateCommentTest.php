<?php

namespace App\Tests\Api\Comments;

use App\Tests\Api\ECampApiTestCase;

/**
 * @internal
 */
class UpdateCommentTest extends ECampApiTestCase {
    public function testResolveCommentIsDeniedForAnonymousUser() {
        $comment = static::getFixture('comment1');
        static::createBasicClient()->request('PATCH', '/comments/'.$comment->getId(), [
            'json' => ['resolved' => true],
            'headers' => ['Content-Type' => 'application/merge-patch+json'],
        ]);

        $this->assertResponseStatusCodeSame(401);
    }

    public function testResolveCommentIsDeniedForUnrelatedUser() {
        $comment = static::getFixture('comment1');
        static::createClientWithCredentials(['email' => static::$fixtures['user4unrelated']->getEmail()])
            ->request('PATCH', '/comments/'.$comment->getId(), [
                'json' => ['resolved' => true],
                'headers' => ['Content-Type' => 'application/merge-patch+json'],
            ])
        ;

        $this->assertResponseStatusCodeSame(404);
    }

    public function testResolveCommentIsAllowedForCollaborator() {
        $comment = static::getFixture('comment1');
        $response = static::createClientWithCredentials(['email' => static::$fixtures['user2member']->getEmail()])
            ->request('PATCH', '/comments/'.$comment->getId(), [
                'json' => ['resolved' => true],
                'headers' => ['Content-Type' => 'application/merge-patch+json'],
            ])
        ;

        $this->assertResponseStatusCodeSame(200);
        $this->assertJsonContains([
            'id' => $comment->getId(),
            '_links' => ['resolvedBy' => ['href' => $this->getIriFor('user2member')]],
        ]);
        $this->assertNotNull($response->toArray()['resolvedAt']);
    }

    public function testReopenResolvedCommentClearsResolveFields() {
        $comment = static::getFixture('comment1');
        $client = static::createClientWithCredentials(['email' => static::$fixtures['user2member']->getEmail()]);

        $client->request('PATCH', '/comments/'.$comment->getId(), [
            'json' => ['resolved' => true],
            'headers' => ['Content-Type' => 'application/merge-patch+json'],
        ]);
        $this->assertResponseStatusCodeSame(200);

        $client->request('PATCH', '/comments/'.$comment->getId(), [
            'json' => ['resolved' => false],
            'headers' => ['Content-Type' => 'application/merge-patch+json'],
        ]);
        $this->assertResponseStatusCodeSame(200);
        $this->assertJsonContains([
            'resolvedAt' => null,
            '_links' => ['resolvedBy' => null],
        ]);
    }

    public function testResolveDoesNotMarkCommentAsEdited() {
        $comment = static::getFixture('comment1');
        $response = static::createClientWithCredentials(['email' => static::$fixtures['user2member']->getEmail()])
            ->request('PATCH', '/comments/'.$comment->getId(), [
                'json' => ['resolved' => true],
                'headers' => ['Content-Type' => 'application/merge-patch+json'],
            ])
        ;

        $this->assertResponseStatusCodeSame(200);
        $this->assertNull($response->toArray()['editedAt']);
    }

    public function testPatchTextHtmlIsAllowedForAuthorAndMarksCommentAsEdited() {
        $comment = static::getFixture('comment1');
        $response = static::createClientWithCredentials()->request('PATCH', '/comments/'.$comment->getId(), [
            'json' => ['textHtml' => 'better wording'],
            'headers' => ['Content-Type' => 'application/merge-patch+json'],
        ]);

        $this->assertResponseStatusCodeSame(200);
        $this->assertJsonContains(['textHtml' => 'better wording']);
        $this->assertNotNull($response->toArray()['editedAt']);
    }

    public function testPatchWithUnchangedTextHtmlDoesNotMarkCommentAsEdited() {
        $comment = static::getFixture('comment1');
        $response = static::createClientWithCredentials()->request('PATCH', '/comments/'.$comment->getId(), [
            'json' => ['textHtml' => $comment->textHtml],
            'headers' => ['Content-Type' => 'application/merge-patch+json'],
        ]);

        $this->assertResponseStatusCodeSame(200);
        $this->assertNull($response->toArray()['editedAt']);
    }

    public function testPatchTextHtmlFiltersMaliciousHtml() {
        $comment = static::getFixture('comment1');
        static::createClientWithCredentials()->request('PATCH', '/comments/'.$comment->getId(), [
            'json' => ['textHtml' => '<b>testText</b><script>alert(1)</script>'],
            'headers' => ['Content-Type' => 'application/merge-patch+json'],
        ]);

        $this->assertResponseStatusCodeSame(200);
        $this->assertJsonContains(['textHtml' => '<b>testText</b>']);
    }

    public function testPatchAnchorIsAllowedForNonAuthorCollaborator() {
        // re-anchoring an orphaned thread: any collaborator may attach the thread
        // to a (new) content node and refresh the anchorText snapshot
        $comment = static::getFixture('comment1anchored');
        static::createClientWithCredentials(['email' => static::$fixtures['user2member']->getEmail()])
            ->request('PATCH', '/comments/'.$comment->getId(), [
                'json' => [
                    'contentNode' => $this->getIriFor('columnLayout1'),
                    'anchorText' => 'newly selected text',
                ],
                'headers' => ['Content-Type' => 'application/merge-patch+json'],
            ])
        ;

        $this->assertResponseStatusCodeSame(200);
        $this->assertJsonContains([
            'anchorText' => 'newly selected text',
            '_links' => ['contentNode' => ['href' => $this->getIriFor('columnLayout1')]],
        ]);
    }

    public function testPatchAnchorRejectsContentNodeFromOtherActivity() {
        $comment = static::getFixture('comment1anchored');
        static::createClientWithCredentials()->request('PATCH', '/comments/'.$comment->getId(), [
            'json' => ['contentNode' => $this->getIriFor('columnLayout3')],
            'headers' => ['Content-Type' => 'application/merge-patch+json'],
        ]);

        $this->assertResponseStatusCodeSame(422);
        $this->assertJsonContains([
            'detail' => 'contentNode: The content node must belong to the same activity as the comment.',
        ]);
    }

    public function testPatchTextHtmlIsDeniedForNonAuthor() {
        // user2member is a collaborator (and may resolve), but only the author
        // may change the comment text
        $comment = static::getFixture('comment1');
        static::createClientWithCredentials(['email' => static::$fixtures['user2member']->getEmail()])
            ->request('PATCH', '/comments/'.$comment->getId(), [
                'json' => ['textHtml' => 'hijacked'],
                'headers' => ['Content-Type' => 'application/merge-patch+json'],
            ])
        ;

        $this->assertResponseStatusCodeSame(403);
        $this->assertJsonContains([
            'title' => 'An error occurred',
            'detail' => 'Access Denied.',
        ]);
    }
}
