<?php

namespace App\Tests\Api\Comments;

use ApiPlatform\Metadata\Post;
use App\Entity\Comment;
use App\Tests\Api\ECampApiTestCase;

/**
 * @internal
 */
class ListCommentsTest extends ECampApiTestCase {
    public function testListCommentsIsDeniedForAnonymousUser() {
        static::createBasicClient()->request('GET', '/comments');

        $this->assertResponseStatusCodeSame(401);
        $this->assertJsonContains([
            'code' => 401,
            'message' => 'JWT Token not found',
        ]);
    }

    public function testListCommentsIsAllowedForLoggedInUser() {
        /** @noRector */
        $response = static::createClientWithCredentials()->request('GET', '/comments');

        $this->assertResponseStatusCodeSame(200);
        $this->assertJsonContains([
            'totalItems' => 6,
            '_embedded' => [
                'items' => [],
            ],
        ]);
        $this->assertEqualsCanonicalizing([
            ['href' => $this->getIriFor('comment1')],
            ['href' => $this->getIriFor('comment2')],
            ['href' => $this->getIriFor('comment3')],
            ['href' => $this->getIriFor('comment1anchored')],
            ['href' => $this->getIriFor('comment1campPrototype')],
            ['href' => $this->getIriFor('comment1campShared')],
        ], $response->toArray()['_links']['items']);
    }

    public function testListCommentsSortyByCreateTime() {
        $client = static::createClientWithCredentials();
        $client->disableReboot();

        // create another comment so that it has a different createTime than the existing fixtures
        $lastComment = $client->request('POST', '/comments', ['json' => $this->getExamplePayload(
            Comment::class,
            Post::class,
            [
                'camp' => $this->getIriFor('camp1'),
                'activity' => $this->getIriFor('activity1'),
            ],
            [
                'author', 'parent', 'contentNode', 'anchorId',
            ],
            []
        )])->toArray();

        $response = $client->request('GET', '/comments');
        $items = $response->toArray()['_embedded']['items'];

        $this->assertCount(7, $items);
        $this->assertGreaterThanOrEqual($items[0]['createTime'], $items[3]['createTime']);
        $this->assertEquals($items[6]['createTime'], $lastComment['createTime']);
    }

    public function testListCommentsFilteredByActivity() {
        $activity = static::getFixture('activity1');
        static::createClientWithCredentials()->request('GET', '/comments?activity='.$this->getIriFor($activity));

        $this->assertResponseStatusCodeSame(200);
        $this->assertJsonContains([
            'totalItems' => 3,
        ]);
    }

    public function testListCommentsActivitySubresource() {
        $activity = static::getFixture('activity1');
        static::createClientWithCredentials()->request('GET', $this->getIriFor($activity).'/comments');

        $this->assertResponseStatusCodeSame(200);
        $this->assertJsonContains([
            'totalItems' => 3,
        ]);
    }

    public function testListCommentsActivitySubresourceIsDeniedForUnrelatedUser() {
        $activity = static::getFixture('activity1');
        static::createClientWithCredentials(['email' => static::$fixtures['user4unrelated']->getEmail()])->request('GET', $this->getIriFor($activity).'/comments');

        $this->assertResponseStatusCodeSame(404);
        $this->assertJsonContains([
            'title' => 'An error occurred',
            'detail' => 'Relation for link security not found.',
        ]);
    }

    public function testListCommentsActivitySubresourceInCampPrototypeIsAllowedForUnrelatedUser() {
        $activity = static::getFixture('activity1campPrototype');
        static::createClientWithCredentials()->request('GET', $this->getIriFor($activity).'/comments');

        $this->assertResponseStatusCodeSame(200);
        $this->assertJsonContains([
            'totalItems' => 1,
        ]);
    }

    public function testListCommentsActivitySubresourceInSharedCampIsAllowedForUnrelatedUser() {
        $activity = static::getFixture('activity1campShared');
        static::createClientWithCredentials()->request('GET', $this->getIriFor($activity).'/comments');

        $this->assertResponseStatusCodeSame(200);
        $this->assertJsonContains([
            'totalItems' => 1,
        ]);
    }

    public function testListCommentsActivitySubresourceInSharedCampIsAllowedForInactiveUser() {
        $activity = static::getFixture('activity1campShared');
        static::createClientWithCredentials(['email' => static::$fixtures['user5inactive']->getEmail()])
            ->request('GET', $this->getIriFor($activity).'/comments')
        ;

        $this->assertResponseStatusCodeSame(200);
        $this->assertJsonContains([
            'totalItems' => 1,
        ]);
    }

    public function testListCommentsActivitySubresourceInSharedCampIsAllowedForInvitedUser() {
        $activity = static::getFixture('activity1campShared');
        static::createClientWithCredentials(['email' => static::$fixtures['user6invited']->getEmail()])
            ->request('GET', $this->getIriFor($activity).'/comments')
        ;

        $this->assertResponseStatusCodeSame(200);
        $this->assertJsonContains([
            'totalItems' => 1,
        ]);
    }
}
