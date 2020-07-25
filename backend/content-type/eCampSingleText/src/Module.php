<?php

namespace eCamp\ContentType\SingleText;

use eCamp\ContentType\SingleText\Entity\SingleText;
use eCamp\Core\ContentType\ConfigFactory;
use eCamp\Core\Entity\User;
use eCamp\Lib\Acl\Acl;
use eCamp\Lib\InputFilter\HtmlPurify;
use Laminas\Mvc\MvcEvent;
use Laminas\Permissions\Acl\AclInterface;

class Module {
    public function getConfig() {
        $config = ConfigFactory::createConfig('SingleText');
        $config['api-tools-content-validation'] = [
            'eCamp\\ContentType\\SingleText\\Controller\\SingleTextController' => [
                'input_filter' => 'eCamp\\ContentType\\SingleText\\Entity\\SingleText\\Validator',
                'use_raw_data' => false,
            ],
        ];
        $config['input_filter_specs'] = [
            'eCamp\\ContentType\\SingleText\\Entity\\SingleText\\Validator' => [
                0 => [
                    'name' => 'text',
                    'required' => false,
                    'filters' => [
                        0 => ['name' => HtmlPurify::class],
                        1 => ['name' => 'Laminas\\Filter\\StringTrim'],
                    ],
                ],
            ],
        ];

        return $config;
    }

    public function onBootstrap(MvcEvent $e) {
        /** @var Acl $acl */
        $acl = $e->getApplication()->getServiceManager()->get(AclInterface::class);

        $acl->addResource(SingleText::class);

        $acl->allow(
            User::ROLE_USER,
            SingleText::class,
            [
                Acl::REST_PRIVILEGE_FETCH,
                Acl::REST_PRIVILEGE_FETCH_ALL,
                // Acl::REST_PRIVILEGE_CREATE,
                // disallow posting directly. Single entities should always be created via ActivityContent.
                Acl::REST_PRIVILEGE_PATCH,
                Acl::REST_PRIVILEGE_UPDATE,
                // Acl::REST_PRIVILEGE_DELETE,
                // disallow deleting directly. Single entities should always be deleted via ActivityContent.
            ]
        );
    }
}
