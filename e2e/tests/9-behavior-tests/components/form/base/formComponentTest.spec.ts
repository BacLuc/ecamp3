import { test, expect } from '@playwright/test'

function formTestUrl(
  component: string,
  options: { props?: unknown; value?: unknown } = {}
) {
  const params = new URLSearchParams()
  if (options.props !== undefined) params.set('props', JSON.stringify(options.props))
  if (options.value !== undefined) params.set('value', JSON.stringify(options.value))
  const query = params.toString()
  return `/form-test/${component}${query ? `?${query}` : ''}`
}

test('lists the available form components', async ({ page }) => {
  await page.goto('/form-test')
  const list = page.getByTestId('form-test-unknown')
  await expect(list).toContainText('ETextField')
  await expect(list).toContainText('ECheckbox')
})

test('ETextField reflects typed input in its v-model', async ({ page }) => {
  await page.goto(formTestUrl('ETextField', { props: { label: 'Name' } }))

  const subject = page.getByTestId('form-test-subject')
  await expect(subject.locator('label').first()).toHaveText('Name')
  await expect(page.getByTestId('form-test-model')).toHaveText('null')

  await subject.locator('input').fill('Hello world')

  await expect(page.getByTestId('form-test-model')).toHaveText('"Hello world"')
})

test('ECheckbox toggles its boolean v-model', async ({ page }) => {
  await page.goto(formTestUrl('ECheckbox', { props: { label: 'Agree' }, value: false }))

  await expect(page.getByTestId('form-test-model')).toHaveText('false')

  await page.getByTestId('form-test-subject').locator('input[type="checkbox"]').click()

  await expect(page.getByTestId('form-test-model')).toHaveText('true')
})

test('ESwitch toggles its boolean v-model', async ({ page }) => {
  await page.goto(formTestUrl('ESwitch', { value: false }))

  await expect(page.getByTestId('form-test-model')).toHaveText('false')

  await page.getByTestId('form-test-subject').getByRole('checkbox').click()

  await expect(page.getByTestId('form-test-model')).toHaveText('true')
})

test('EPasswordField reflects typed input and reveals the password', async ({ page }) => {
  await page.goto(formTestUrl('EPasswordField'))

  const subject = page.getByTestId('form-test-subject')
  const input = subject.locator('input')
  await input.fill('secret')

  await expect(page.getByTestId('form-test-model')).toHaveText('"secret"')
  await expect(input).toHaveAttribute('type', 'password')

  await subject.getByRole('button').click()

  await expect(input).toHaveAttribute('type', 'text')
})

test('ENumberField parses decimal input into its numeric v-model', async ({ page }) => {
  await page.goto(formTestUrl('ENumberField'))

  await page.getByTestId('form-test-subject').locator('input').fill('12.34')

  await expect(page.getByTestId('form-test-model')).toHaveText('12.34')
})

test('EParseField uses identity parsing by default', async ({ page }) => {
  await page.goto(formTestUrl('EParseField'))

  await page.getByTestId('form-test-subject').locator('input').fill('parsed value')

  await expect(page.getByTestId('form-test-model')).toHaveText('"parsed value"')
})

test('EColorField normalizes valid hex input', async ({ page }) => {
  await page.goto(formTestUrl('EColorField'))

  await page.getByTestId('form-test-subject').locator('input').fill('#aabbcc')

  await expect(page.getByTestId('form-test-model')).toHaveText('"#AABBCC"')
})

test('ESelect selects a scalar item value', async ({ page }) => {
  await page.goto(
    formTestUrl('ESelect', {
      props: {
        label: 'Choice',
        items: [
          { text: 'First', value: 'first' },
          { text: 'Second', value: 'second' },
        ],
      },
    })
  )

  await page.getByTestId('form-test-subject').getByRole('combobox').first().click()
  await page.locator('.v-overlay--active').getByRole('option', { name: 'Second' }).click()

  await expect(page.getByTestId('form-test-model')).toHaveText('"second"')
})

test('EAutocomplete filters and selects a scalar item value', async ({ page }) => {
  await page.goto(
    formTestUrl('EAutocomplete', {
      props: {
        label: 'Search',
        items: [
          { text: 'First', value: 'first' },
          { text: 'Second', value: 'second' },
        ],
      },
    })
  )

  await page
    .getByTestId('form-test-subject')
    .getByRole('combobox', { name: 'Search' })
    .fill('Sec')
  await page.locator('.v-overlay--active').getByRole('option', { name: 'Second' }).click()

  await expect(page.getByTestId('form-test-model')).toHaveText('"second"')
})

test('ETimeField normalizes permissive time input', async ({ page }) => {
  await page.goto(formTestUrl('ETimeField'))

  await page.getByTestId('form-test-subject').locator('input').fill('930')

  await expect(page.getByTestId('form-test-model')).toHaveText('"09:30"')
})

test('ETimeDropdown selects an exact item value', async ({ page }) => {
  await page.goto(
    formTestUrl('ETimeDropdown', {
      value: '09:00',
      props: {
        items: [
          { label: '09:00', value: '09:00', date: '2026-01-01T09:00:00Z' },
          { label: '10:30', value: '10:30', date: '2026-01-01T10:30:00Z' },
        ],
      },
    })
  )

  await page.getByTestId('form-test-subject').locator('input').click()
  await page.locator('.v-overlay--active').getByText('10:30', { exact: true }).click()

  await expect(page.getByTestId('form-test-model')).toHaveText('"10:30"')
})

test('ETextarea reflects editor input as HTML', async ({ page }) => {
  await page.goto(formTestUrl('ETextarea'))

  await page.getByTestId('form-test-subject').locator('.ProseMirror').fill('Plain text')

  await expect(page.getByTestId('form-test-model')).toHaveText('"<p>Plain text</p>"')
})
