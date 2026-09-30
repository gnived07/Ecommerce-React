import test from 'node:test'
import assert from 'node:assert/strict'
import { formatCurrency } from '../src/lib/format.js'

test('formats integer minor units as rupee amounts', () => {
  assert.equal(formatCurrency(49900), '₹499')
  assert.equal(formatCurrency(0), '₹0')
})

test('groups larger rupee amounts using Indian digit grouping', () => {
  assert.equal(formatCurrency(123456700), '₹12,34,567')
})
