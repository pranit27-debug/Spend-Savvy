// Test script to check alcohol detection
import { checkBillForUnsafeItems } from './lib/notifications.js';

const testAlcoholBill = [
  { item_name: "BONDI BREWING CO BEACH BEER", price: 132.00 },
  { item_name: "VODKA BOTTLE", price: 45.50 },
  { item_name: "WINE RED", price: 25.99 }
];

console.log('=== Testing Alcohol Detection ===');
console.log('Test items:', testAlcoholBill);

// Test the function
async function testDetection() {
  try {
    const result = await checkBillForUnsafeItems(
      testAlcoholBill,
      'test-relationship-id',
      'Test Child',
      'parent@test.com',
      '+1234567890'
    );
    
    console.log('Detection result:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

testDetection();
