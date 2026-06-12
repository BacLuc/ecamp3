<?php

namespace App\Tests\Api\Comments;

use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\Post;
use App\Entity\Comment;
use App\Tests\Api\ECampApiTestCase;

/**
 * @internal
 */
class CreateCommentTest extends ECampApiTestCase {
    public function testCreateCommentIsDeniedForAnonymousUser() {
        static::createBasicClient()->request('POST', '/comments', ['json' => $this->getExampleWritePayload()]);

        $this->assertResponseStatusCodeSame(401);
        $this->assertJsonContains([
            'code' => 401,
            'message' => 'JWT Token not found',
        ]);
    }

    public function testCreateCommentIsNotPossibleForUnrelatedUserBecauseCampIsNotReadable() {
        static::createClientWithCredentials(['email' => static::$fixtures['user4unrelated']->getEmail()])
            ->request('POST', '/comments', ['json' => $this->getExampleWritePayload()])
        ;
        $this->assertResponseStatusCodeSame(400);
        $this->assertJsonContains([
            'title' => 'An error occurred',
            'detail' => 'Item not found for "'.$this->getIriFor('camp1').'".',
        ]);
    }

    public function testCreateCommentIsAllowedForGuest() {
        static::createClientWithCredentials(['email' => static::$fixtures['user3guest']->getEmail()])
            ->request('POST', '/comments', ['json' => $this->getExampleWritePayload()])
        ;

        $this->assertResponseStatusCodeSame(201);
        $this->assertJsonContains($this->getExampleReadPayload());
    }

    public function testCreateCommentIsAllowedForMember() {
        static::createClientWithCredentials(['email' => static::$fixtures['user2member']->getEmail()])
            ->request('POST', '/comments', ['json' => $this->getExampleWritePayload()])
        ;

        $this->assertResponseStatusCodeSame(201);
        $this->assertJsonContains($this->getExampleReadPayload());
    }

    public function testCreateCommentIsAllowedForManager() {
        static::createClientWithCredentials()->request('POST', '/comments', ['json' => $this->getExampleWritePayload()]);

        $this->assertResponseStatusCodeSame(201);
        $this->assertJsonContains($this->getExampleReadPayload());
    }

    public function testCreateCommentInCampPrototypeIsDeniedForUnrelatedUser() {
        static::createClientWithCredentials()->request('POST', '/comments', ['json' => $this->getExampleWritePayload([
            'camp' => $this->getIriFor('campPrototype'),
            'activity' => $this->getIriFor('activity1campPrototype'),
        ])]);

        $this->assertResponseStatusCodeSame(403);
        $this->assertJsonContains([
            'title' => 'An error occurred',
            'detail' => 'Access Denied.',
        ]);
    }

    public function testCreateCommentInSharedCampIsDeniedForUnrelatedUser() {
        static::createClientWithCredentials()->request('POST', '/comments', ['json' => $this->getExampleWritePayload([
            'camp' => $this->getIriFor('campShared'),
            'activity' => $this->getIriFor('activity1campPrototype'),
        ])]);

        $this->assertResponseStatusCodeSame(403);
        $this->assertJsonContains([
            'title' => 'An error occurred',
            'detail' => 'Access Denied.',
        ]);
    }

    public function testCreateCommentInSharedCampIsDeniedForInactiveUser() {
        static::createClientWithCredentials(['email' => static::$fixtures['user5inactive']->getEmail()])->request('POST', '/comments', ['json' => $this->getExampleWritePayload([
            'camp' => $this->getIriFor('campShared'),
            'activity' => $this->getIriFor('activity1campPrototype'),
        ])]);

        $this->assertResponseStatusCodeSame(403);
        $this->assertJsonContains([
            'title' => 'An error occurred',
            'detail' => 'Access Denied.',
        ]);
    }

    public function testCreateCommentInSharedCampIsDeniedForInvitedUser() {
        static::createClientWithCredentials(['email' => static::$fixtures['user6invited']->getEmail()])->request('POST', '/comments', ['json' => $this->getExampleWritePayload([
            'camp' => $this->getIriFor('campShared'),
            'activity' => $this->getIriFor('activity1campPrototype'),
        ])]);

        $this->assertResponseStatusCodeSame(403);
        $this->assertJsonContains([
            'title' => 'An error occurred',
            'detail' => 'Access Denied.',
        ]);
    }

    public function testCreateCommentValidatesMissingText() {
        static::createClientWithCredentials()->request('POST', '/comments', ['json' => $this->getExampleWritePayload([], ['textHtml'])]);

        $this->assertResponseStatusCodeSame(422);
        $this->assertJsonContains([
            'violations' => [
                [
                    'propertyPath' => 'textHtml',
                    'message' => 'This value should not be blank.',
                ],
            ],
        ]);
    }

    public function testCreateCommentValidatesTextMaxLength() {
        static::createClientWithCredentials()->request('POST', '/comments', ['json' => $this->getExampleWritePayload([
            'textHtml' => str_repeat('a', 1025),
        ])]);

        $this->assertResponseStatusCodeSame(422);
        $this->assertJsonContains([
            'violations' => [
                [
                    'propertyPath' => 'textHtml',
                    'message' => 'This value is too long. It should have 1024 characters or less.',
                ],
            ],
        ]);
    }

    public function testCreateCommentRejectsAuthorInPayload() {
        static::createClientWithCredentials()->request('POST', '/comments', ['json' => $this->getExampleWritePayload(['author' => $this->getIriFor('user1manager')])]);

        $this->assertResponseStatusCodeSame(400);
        $this->assertJsonContains([
            'detail' => 'Extra attributes are not allowed ("author" is unknown).',
        ]);
    }

    public function testCreateCommentRejectsActivityCampMismatch() {
        static::createClientWithCredentials()->request('POST', '/comments', ['json' => $this->getExampleWritePayload(['camp' => $this->getIriFor('camp2')])]);

        $this->assertResponseStatusCodeSame(422);
        $this->assertJsonContains([
            'detail' => 'activity: Must belong to the same camp.',
        ]);
    }

    public function testCreateCommentFiltersMaliciousHtml() {
        static::createClientWithCredentials()->request('POST', '/comments', ['json' => $this->getExampleWritePayload(['textHtml' => '<b>testText</b><script>alert(1)</script>'])]);

        $this->assertResponseStatusCodeSame(201);
        $this->assertJsonContains($this->getExampleReadPayload(['textHtml' => '<b>testText</b>']));
    }

    public function testCreateAnchoredCommentIsAllowed() {
        static::createClientWithCredentials()->request('POST', '/comments', ['json' => $this->getExampleWritePayload([
            'contentNode' => $this->getIriFor('columnLayout1'),
            'anchorId' => '7d68c4c2-db9e-465f-84ab-593c50989ad7',
        ])]);

        $this->assertResponseStatusCodeSame(201);
        $this->assertJsonContains([
            'anchorId' => '7d68c4c2-db9e-465f-84ab-593c50989ad7',
            '_links' => ['contentNode' => ['href' => $this->getIriFor('columnLayout1')]],
        ]);
    }

    public function testCreateAnchoredCommentRejectsContentNodeFromOtherCamp() {
        $response = static::createClientWithCredentials()->request('POST', '/comments', ['json' => $this->getExampleWritePayload([
            'contentNode' => $this->getIriFor('columnLayout1camp2'),
            'anchorId' => '7d68c4c2-db9e-465f-84ab-593c50989ad7',
        ])]);

        $this->assertResponseStatusCodeSame(422);
        // the same-activity validation fires as well, so only assert that the
        // same-camp violation is among them
        $this->assertStringContainsString(
            'contentNode: Must belong to the same camp.',
            $response->toArray(false)['detail']
        );
    }

    public function testCreateAnchoredCommentRejectsContentNodeFromOtherActivity() {
        // columnLayout3 belongs to activity2, which is in the same camp
        static::createClientWithCredentials()->request('POST', '/comments', ['json' => $this->getExampleWritePayload([
            'contentNode' => $this->getIriFor('columnLayout3'),
            'anchorId' => '7d68c4c2-db9e-465f-84ab-593c50989ad7',
        ])]);

        $this->assertResponseStatusCodeSame(422);
        $this->assertJsonContains([
            'detail' => 'contentNode: The content node must belong to the same activity as the comment.',
        ]);
    }

    public function testCreateAnchoredCommentRejectsAnchorIdWithoutContentNode() {
        static::createClientWithCredentials()->request('POST', '/comments', ['json' => $this->getExampleWritePayload([
            'anchorId' => '7d68c4c2-db9e-465f-84ab-593c50989ad7',
        ])]);

        $this->assertResponseStatusCodeSame(422);
        $this->assertJsonContains([
            'detail' => 'contentNode: contentNode and anchorId must be set together.',
        ]);
    }

    public function testCreateAnchoredCommentRejectsContentNodeWithoutAnchorId() {
        static::createClientWithCredentials()->request('POST', '/comments', ['json' => $this->getExampleWritePayload([
            'contentNode' => $this->getIriFor('columnLayout1'),
        ])]);

        $this->assertResponseStatusCodeSame(422);
        $this->assertJsonContains([
            'detail' => 'contentNode: contentNode and anchorId must be set together.',
        ]);
    }

    public function testCreateAnchoredCommentStoresAnchorText() {
        static::createClientWithCredentials()->request('POST', '/comments', ['json' => $this->getExampleWritePayload([
            'contentNode' => $this->getIriFor('columnLayout1'),
            'anchorId' => '7d68c4c2-db9e-465f-84ab-593c50989ad7',
            'anchorText' => 'the sentence that was commented on',
        ])]);

        $this->assertResponseStatusCodeSame(201);
        $this->assertJsonContains([
            'anchorText' => 'the sentence that was commented on',
        ]);
    }

    public function testCreateCommentValidatesAnchorTextMaxLength() {
        static::createClientWithCredentials()->request('POST', '/comments', ['json' => $this->getExampleWritePayload([
            'contentNode' => $this->getIriFor('columnLayout1'),
            'anchorId' => '7d68c4c2-db9e-465f-84ab-593c50989ad7',
            'anchorText' => str_repeat('a', 256),
        ])]);

        $this->assertResponseStatusCodeSame(422);
        $this->assertJsonContains([
            'violations' => [
                [
                    'propertyPath' => 'anchorText',
                    'message' => 'This value is too long. It should have 255 characters or less.',
                ],
            ],
        ]);
    }

    public function testCreateCommentValidatesAnchorIdMaxLength() {
        static::createClientWithCredentials()->request('POST', '/comments', ['json' => $this->getExampleWritePayload([
            'contentNode' => $this->getIriFor('columnLayout1'),
            'anchorId' => str_repeat('a', 37),
        ])]);

        $this->assertResponseStatusCodeSame(422);
        $this->assertJsonContains([
            'violations' => [
                [
                    'propertyPath' => 'anchorId',
                    'message' => 'This value is too long. It should have 36 characters or less.',
                ],
            ],
        ]);
    }

    public function testCreateReplyIsAllowed() {
        static::createClientWithCredentials()->request('POST', '/comments', ['json' => $this->getExampleWritePayload([
            'parent' => $this->getIriFor('comment1'),
        ])]);

        $this->assertResponseStatusCodeSame(201);
        $this->assertJsonContains([
            '_links' => ['parent' => ['href' => $this->getIriFor('comment1')]],
        ]);
    }

    public function testCreateReplyRejectsParentFromOtherCamp() {
        $response = static::createClientWithCredentials()->request('POST', '/comments', ['json' => $this->getExampleWritePayload([
            'parent' => $this->getIriFor('comment1campShared'),
        ])]);

        $this->assertResponseStatusCodeSame(422);
        // the same-activity validation fires as well, so only assert that the
        // same-camp violation is among them
        $this->assertStringContainsString(
            'parent: Must belong to the same camp.',
            $response->toArray(false)['detail']
        );
    }

    public function testCreateReplyRejectsParentFromOtherActivity() {
        // comment3 belongs to activity2, which is in the same camp
        static::createClientWithCredentials()->request('POST', '/comments', ['json' => $this->getExampleWritePayload([
            'parent' => $this->getIriFor('comment3'),
        ])]);

        $this->assertResponseStatusCodeSame(422);
        $this->assertJsonContains([
            'detail' => 'parent: A reply must belong to the same activity as its parent.',
        ]);
    }

    public function testCreateReplyRejectsNestedReply() {
        // threads are flat, like in Google Docs: replies always point at the root
        $client = static::createClientWithCredentials();
        // without this, the kernel reboot between the two requests would roll the
        // database back and the created reply would not be visible to the second one
        $client->disableReboot();
        $reply = $client->request('POST', '/comments', ['json' => $this->getExampleWritePayload([
            'parent' => $this->getIriFor('comment1'),
        ])]);
        $this->assertResponseStatusCodeSame(201);
        $replyIri = $reply->toArray()['_links']['self']['href'];

        $client->request('POST', '/comments', ['json' => $this->getExampleWritePayload([
            'parent' => $replyIri,
        ])]);

        $this->assertResponseStatusCodeSame(422);
        $this->assertJsonContains([
            'detail' => 'parent: Replies cannot be nested. Reply to the root comment of the thread.',
        ]);
    }

    public function testCreateReplyRejectsOwnAnchor() {
        // replies inherit the anchor from the root comment of their thread
        static::createClientWithCredentials()->request('POST', '/comments', ['json' => $this->getExampleWritePayload([
            'parent' => $this->getIriFor('comment1'),
            'contentNode' => $this->getIriFor('columnLayout1'),
            'anchorId' => '7d68c4c2-db9e-465f-84ab-593c50989ad7',
        ])]);

        $this->assertResponseStatusCodeSame(422);
        $this->assertJsonContains([
            'detail' => 'parent: Replies inherit the anchor from the root comment and cannot carry their own.',
        ]);
    }

    #[\Override]
    public function getExampleWritePayload($attributes = [], $except = []) {
        return $this->getExamplePayload(
            Comment::class,
            Post::class,
            array_merge([
                'camp' => $this->getIriFor('camp1'),
                'activity' => $this->getIriFor('activity1'),
            ], $attributes),
            // author is set by the processor; parent/contentNode/anchorId/anchorText
            // are optional fields only used for replies and inline (anchored) comments.
            ['author', 'parent', 'contentNode', 'anchorId', 'anchorText'],
            $except
        );
    }

    public function getExampleReadPayload($attributes = [], $except = []) {
        return $this->getExamplePayload(
            Comment::class,
            Get::class,
            $attributes,
            ['camp', 'activity', 'author', 'parent', 'children', 'contentNode', 'anchorId', 'anchorText', 'resolvedAt', 'resolvedBy', 'editedAt'],
            $except
        );
    }
}
