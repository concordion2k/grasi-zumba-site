import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

// Hoisted so the vi.mock factories below can reference them.
const { registerSpy, pushSpy } = vi.hoisted(() => ({ registerSpy: vi.fn(), pushSpy: vi.fn() }));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: pushSpy }),
  useRoute: () => ({ query: {} }),
  RouterLink: { template: '<a><slot /></a>' },
}));
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ register: registerSpy }) }));

import RegisterView from '@/views/RegisterView.vue';

describe('RegisterView', () => {
  beforeEach(() => {
    registerSpy.mockReset().mockResolvedValue(undefined);
    pushSpy.mockReset();
  });

  const termsCheckbox = 'input[required][type="checkbox"]';

  it('keeps the submit button disabled until the terms checkbox is checked', async () => {
    const w = mount(RegisterView);
    const submit = w.find('button[type="submit"]');
    expect(submit.attributes('disabled')).toBeDefined();

    await w.find(termsCheckbox).setValue(true);
    expect(submit.attributes('disabled')).toBeUndefined();
  });

  it('registers with acceptedTerms=true once the box is checked, then redirects', async () => {
    const w = mount(RegisterView);
    await w.find('#name').setValue('Grasi Fan');
    await w.find('#email').setValue('fan@example.com');
    await w.find('#birthday').setValue('1990-05-01');
    await w.find('#password').setValue('password1234');
    await w.find(termsCheckbox).setValue(true);

    await w.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(registerSpy).toHaveBeenCalledTimes(1);
    expect(registerSpy).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'fan@example.com', acceptedTerms: true }),
    );
    expect(pushSpy).toHaveBeenCalledWith('/dashboard');
  });
});
