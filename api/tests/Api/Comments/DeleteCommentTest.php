<?php

namespace App\Tests\Api\Comments;

use App\Entity\Comment;
use App\Tests\Api\ECampApiTestCase;

/**
 * @internal
 */
class DeleteCommentTest extends ECampApiTestCase {
    public function testDeleteCommentIsDeniedForAnonymousUser() {
        $comment = static::getFixture('comment1');
        static::createBasicClient()->request('DELETE', '/comments/'.$comment->getId());

        $this->assertResponseStatusCodeSame(401);
        $this->assertJsonContains([
            'code' => 401,
            'message' => 'JWT Token not found',
        ]);
    }

    public function testDeleteCommentIsDeniedForNonAuthor() {
        $comment = static::getFixture('comment1');
        static::createClientWithCredentials(['email' => static::$fixtures['user4unrelated']->getEmail()])
            ->request('DELETE', '/comments/'.$comment->getId())
        ;

        $this->assertResponseStatusCodeSame(404);
        $this->assertJsonContains([
            'title' => 'An error occurred',
            'detail' => 'Not Found',
        ]);
    }

    public function testDeleteCommentIsDeniedForNonAuthorMember() {
        $comment = static::getFixture('comment1');
        static::createClientWithCredentials(['email' => static::$fixtures['user2member']->getEmail()])
            ->request('DELETE', '/comments/'.$comment->getId())
        ;

        $this->assertResponseStatusCodeSame(403);
        $this->assertJsonContains([
            'title' => 'An error occurred',
            'detail' => 'Access Denied.',
        ]);
    }

    public function testDeleteCommentIsAllowedForNonAuthorManagerInSameCamp() {
        // camp managers may moderate, like a document owner in Google Docs
        $comment = static::getFixture('comment1');
        static::createClientWithCredentials(['email' => static::$fixtures['user7manager']->getEmail()])
            ->request('DELETE', '/comments/'.$comment->getId())
        ;

        $this->assertResponseStatusCodeSame(204);
        $this->assertNull($this->getEntityManager()->getRepository(Comment::class)->find($comment->getId()));
    }

    public function testDeleteCommentIsAllowedForAuthor() {
        $comment = static::getFixture('comment1');
        static::createClientWithCredentials()->request('DELETE', '/comments/'.$comment->getId());

        $this->assertResponseStatusCodeSame(204);
        $this->assertNull($this->getEntityManager()->getRepository(Comment::class)->find($comment->getId()));
    }

    public function testDeleteCommentIsAllowedForAuthorEvenWhenAuthorIsNotCampCollaboratorInCampAnymore() {
        $comment = static::getFixture('comment2');
        static::createClientWithCredentials(['email' => static::$fixtures['user4unrelated']->getEmail()])
            ->request('DELETE', '/comments/'.$comment->getId())
        ;

        $this->assertResponseStatusCodeSame(204);
        $this->assertNull($this->getEntityManager()->getRepository(Comment::class)->find($comment->getId()));
    }
}
