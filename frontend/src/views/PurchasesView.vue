<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { LedgerEntry, LedgerEntryType } from '@grasi/shared';
import { formatUsd } from '@grasi/shared';
import { meApi } from '@/api/endpoints';
import { formatDate } from '@/utils/format';

const purchases = ref<LedgerEntry[]>([]);
const totalCents = ref(0);
const loading = ref(true);
const error = ref('');

const PURCHASE_LABELS: Record<LedgerEntryType, string> = {
  manual_credit: 'Credit added',
  package_purchase: 'Class pack',
  dropin_payment: 'Drop-in class',
  subscription: 'Unlimited subscription',
  adjustment: 'Adjustment',
  class_booking: 'Class booking',
};

onMounted(async () => {
  try {
    const { purchases: p } = await meApi.billing();
    purchases.value = p;
    totalCents.value = p.reduce((s, e) => s + e.amountCents, 0);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Could not load your purchases.';
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="section">
    <div class="container narrow">
      <RouterLink to="/dashboard" class="back">← Back to My Account</RouterLink>

      <h1>Purchase history</h1>

      <div v-if="error" class="alert alert-error">{{ error }}</div>
      <div v-if="loading" class="spinner"></div>

      <template v-else>
        <p v-if="purchases.length === 0" class="muted">You haven't made any purchases yet.</p>
        <div v-else class="card">
          <table class="purchases">
            <thead>
              <tr>
                <th>Date</th>
                <th>Item</th>
                <th class="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in purchases" :key="p.entryId">
                <td class="nowrap">{{ formatDate(p.createdAt) }}</td>
                <td>
                  {{ PURCHASE_LABELS[p.type] }}
                  <span v-if="p.note" class="muted small block">{{ p.note }}</span>
                </td>
                <td class="num">{{ formatUsd(p.amountCents) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" class="total-label">Total</td>
                <td class="num total">{{ formatUsd(totalCents) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.narrow {
  max-width: 720px;
}
.back {
  display: inline-block;
  margin-bottom: 1rem;
  font-weight: 700;
  color: var(--c-pink-dark);
}
.purchases {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.92rem;
}
.purchases th,
.purchases td {
  text-align: left;
  padding: 0.6rem 0.5rem;
  border-bottom: 1px solid var(--c-line);
  vertical-align: top;
}
.purchases th {
  font-family: var(--font-display);
  font-size: 0.8rem;
  color: var(--c-ink-soft);
}
.purchases .num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.nowrap {
  white-space: nowrap;
}
.total-label {
  text-align: right;
  font-weight: 700;
}
.total {
  font-weight: 800;
  border-bottom: none;
}
.purchases tfoot td {
  border-bottom: none;
  padding-top: 0.85rem;
}
.block {
  display: block;
}
.small {
  font-size: 0.82rem;
}
</style>
