// Simple debug script to test assessment loading
console.log('Debug script loaded')

document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded')
  
  const container = document.getElementById('assessment-form')
  console.log('Assessment container:', container)
  
  if (container) {
    container.innerHTML = `
      <div class="space-y-6">
        <h3 class="text-2xl font-bold text-gray-800 mb-6">Basic Information</h3>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">What is your profession?</label>
          <select id="profession" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" required>
            <option value="">Select your profession</option>
            <option value="doctor">Doctor/Medical Professional</option>
            <option value="lawyer">Lawyer/Attorney</option>
            <option value="business_owner">Business Owner</option>
            <option value="real_estate">Real Estate Professional</option>
            <option value="executive">Corporate Executive</option>
            <option value="consultant">Consultant</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">What is your approximate net worth?</label>
          <div class="space-y-2">
            <label class="flex items-center">
              <input type="radio" name="netWorth" value="under_500k" class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 mr-3">
              <span>Under $500,000</span>
            </label>
            <label class="flex items-center">
              <input type="radio" name="netWorth" value="500k_1m" class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 mr-3">
              <span>$500,000 - $1,000,000</span>
            </label>
            <label class="flex items-center">
              <input type="radio" name="netWorth" value="1m_5m" class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 mr-3">
              <span>$1,000,000 - $5,000,000</span>
            </label>
            <label class="flex items-center">
              <input type="radio" name="netWorth" value="5m_10m" class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 mr-3">
              <span>$5,000,000 - $10,000,000</span>
            </label>
            <label class="flex items-center">
              <input type="radio" name="netWorth" value="over_10m" class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 mr-3">
              <span>Over $10,000,000</span>
            </label>
          </div>
        </div>

        <div class="flex justify-end">
          <button onclick="nextStep()" class="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
            Next Step <i class="fas fa-arrow-right ml-2"></i>
          </button>
        </div>
      </div>
    `
    
    console.log('Assessment form loaded successfully')
  } else {
    console.error('Assessment container not found')
  }
})

function nextStep() {
  alert('Next step button clicked!')
}