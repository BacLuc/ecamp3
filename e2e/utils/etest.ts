import { test as base } from '@playwright/test'
import { runIdFixture, RunIdFixtureType } from '@/utils/fixtures/runId'
import {
  loginPageFixture,
  LoginPageFixtureType,
} from '@/utils/fixtures/pageObjects/loginPage'
import { campFixture, CampFixtureType } from '@/utils/fixtures/domainObjects/camp'

const fixtureObject = {
  ...runIdFixture,
  ...loginPageFixture,
  ...campFixture,
}

export const test = base.extend<
  LoginPageFixtureType & RunIdFixtureType & CampFixtureType
>(fixtureObject)
