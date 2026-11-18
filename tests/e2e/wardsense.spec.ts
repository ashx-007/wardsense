// tests/e2e/wardsense.spec.ts — requires running app + seeded Supabase + env credentials
import { test, expect } from '@playwright/test';

const EMAIL = process.env.E2E_SUPERVISOR_EMAIL ?? '';
const PASSWORD = process.env.E2E_SUPERVISOR_PASSWORD ?? '';

test.skip(!EMAIL || !PASSWORD, 'Set E2E_SUPERVISOR_EMAIL / E2E_SUPERVISOR_PASSWORD');

test('login → create patient → live score → preview → approve → alert page', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(EMAIL);
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/dashboard/);

    await page.goto('/patients');
    await page.getByRole('button', { name: '+ Patient' }).click();
    const bed = `E2E-${Date.now() % 100000}`;
    await page.getByLabel('Bed').fill(bed);
    await expect(page.getByTestId('live-workload')).toHaveText('W = 4');
    await page.getByRole('button', { name: 'Create patient' }).click();
    await expect(page.getByRole('cell', { name: bed })).toBeVisible();

    await page.goto('/allocation');
    await page.getByRole('button', { name: 'Generate allocation preview' }).click();
    await expect(page.getByText('Proposed assignments')).toBeVisible();
    const approve = page.getByRole('button', { name: 'Approve', exact: true });
    if (await approve.isEnabled()) {
        await approve.click();
        await expect(page.getByText('approved', { exact: true }).first()).toBeVisible();
    }

    await page.goto('/alerts');
    await expect(page.getByText('Safety alerts')).toBeVisible();

    await page.goto('/patients');
    await page.getByRole('row', { name: new RegExp(bed) }).getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Delete', exact: true }).last().click();
});