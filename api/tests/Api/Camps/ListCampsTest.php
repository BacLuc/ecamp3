<?php

namespace App\Tests\Api\Camps;

use App\Repository\CampRepository;
use App\Tests\Api\ECampApiTestCase;

/**
 * @internal
 */
class ListCampsTest extends ECampApiTestCase {
    public function testListCampsIsDeniedToAnonymousUser() {
        static::createClient()->request('GET', '/camps');
        $this->assertResponseStatusCodeSame(401);
        $this->assertJsonContains([
            'code' => 401,
            'message' => 'JWT Token not found',
        ]);
    }

    public function testListCampsIsAllowedForLoggedInUserButFiltered() {
        static::createClientWithCredentials()->request('GET', '/camps');
        $this->assertResponseStatusCodeSame(200);
        $campIri = $this->getIriConverter()->getIriFromItem(static::$fixtures['camp1']);
        $this->assertJsonContains([
            'totalItems' => 1,
            '_embedded' => [
                'items' => [
                    [
                        '_links' => [
                            'self' => [
                                'href' => $campIri,
                            ],
                        ],
                    ],
                ],
            ],
        ]);
    }

    public function testListCampsListsAllCampsForAdmin() {
        $client = static::createClientWithAdminCredentials();
        $response = $client->request('GET', '/camps');
        $totalCamps = count(static::$container->get(CampRepository::class)->findAll());
        $this->assertResponseStatusCodeSame(200);
        $this->assertJsonContains([
            'totalItems' => $totalCamps,
            '_embedded' => [
                'items' => [],
            ],
        ]);
        $this->assertEquals($totalCamps, count($response->toArray(true)['_embedded']['items']));
    }
}
