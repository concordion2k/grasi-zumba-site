import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { ApiRequestError } from '@/api/client';

const { loginSpy, pushSpy } = vi.hoisted(() => ({ loginSpy: vi.fn(), pushSpy: vi.fn() }));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: pushSpy }),
  useRoute: () => ({ query: {} }),
  RouterLink: { template: '<a><slot /></a>' },
}));
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ login: loginSpy }) }));

import LoginView from '@/views/LoginView.vue';

describe('LoginView', () => {
  beforeEach(() => {
    loginSpy.mockReset();
    pushSpy.mockReset();
  });

  it('logs in with the entered credentials and redirects on success', async () => {
    loginSpy.mockResolvedValue(undefined);
    const w = mount(LoginView);
    await w.find('#email').setValue('a@example.com');
    await w.find('#password').setValue('password1234');
    await w.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(loginSpy).toHaveBeenCalledWith({ email: 'a@example.com', password: 'password1234' });
    expect(pushSpy).toHaveBeenCalledWith('/dashboard');
  });

  it('shows an error alert when login fails', async () => {
    loginSpy.mockRejectedValue(new ApiRequestError(401, 'Invalid email or password'));
    const w = mount(LoginView);
    await w.find('#email').setValue('a@example.com');
    await w.find('#password').setValue('wrong-password');
    await w.find('form').trigger('submit.prevent');
    await flushPromises();

    const alert = w.find('.alert-error');
    expect(alert.exists()).toBe(true);
    expect(alert.text()).toContain('Invalid email or password');
    expect(pushSpy).not.toHaveBeenCalled();
  });
});
