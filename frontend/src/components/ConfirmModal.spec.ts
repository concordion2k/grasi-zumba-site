import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ConfirmModal from '@/components/ConfirmModal.vue';

function mountModal(props: Record<string, unknown> = {}, slot = 'Body content') {
  return mount(ConfirmModal, {
    props: { open: true, ...props },
    slots: { default: slot },
    // Render the teleported content inline so we can query it.
    global: { stubs: { teleport: true } },
  });
}

describe('ConfirmModal', () => {
  it('renders the title and slotted body when open', () => {
    const w = mountModal({ title: 'Delete this?' }, 'This cannot be undone.');
    expect(w.text()).toContain('Delete this?');
    expect(w.text()).toContain('This cannot be undone.');
  });

  it('emits confirm and cancel from the action buttons', async () => {
    const w = mountModal({ confirmText: 'Yes', cancelText: 'No' });
    await w.find('.btn-primary').trigger('click');
    expect(w.emitted('confirm')).toBeTruthy();
    await w.find('.btn-ghost').trigger('click');
    expect(w.emitted('cancel')).toBeTruthy();
  });

  it('uses the danger style and disables buttons while busy', () => {
    const w = mountModal({ variant: 'danger', busy: true, confirmText: 'Delete' });
    expect(w.find('.btn-danger').exists()).toBe(true);
    expect(w.text()).toContain('Working…');
    expect(w.findAll('button').every((b) => b.attributes('disabled') !== undefined)).toBe(true);
  });

  it('renders nothing when closed', () => {
    const w = mount(ConfirmModal, {
      props: { open: false },
      global: { stubs: { teleport: true } },
    });
    expect(w.find('.modal').exists()).toBe(false);
  });
});
