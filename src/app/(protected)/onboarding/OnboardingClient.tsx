'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const affiliationTypes = [
  { value: 'student', label: 'Student', icon: '🎓' },
  { value: 'academic', label: 'Academic / Researcher', icon: '🏛️' },
  { value: 'professional', label: 'Professional', icon: '💼' },
  { value: 'independent', label: 'Independent Researcher', icon: '📚' },
  { value: 'other', label: 'Other', icon: '✨' },
];

const fieldSuggestions = [
  'Economics',
  'Finance',
  'Business',
  'Mathematics',
  'Statistics',
  'Computer Science',
  'Political Science',
  'Public Policy',
  'Engineering',
  'Physics',
  'Data Science',
];

export default function OnboardingClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [affiliation, setAffiliation] = useState('');
  const [affiliationOther, setAffiliationOther] = useState('');
  const [field, setField] = useState('');
  const [institution, setInstitution] = useState('');

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  async function checkOnboardingStatus() {
    try {
      // Check if user already has a researcher profile
      const response = await fetch('/api/researcher/profile');
      if (response.ok) {
        const data = await response.json();
        if (data.profile && data.profile.onboarding_completed) {
          // Already onboarded, redirect to home
          router.push('/');
          return;
        }
      }
    } catch (err) {
      console.error('Error checking onboarding status:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!affiliation) {
      setError('Please select your affiliation');
      return;
    }

    if (affiliation === 'other' && !affiliationOther.trim()) {
      setError('Please specify your affiliation');
      return;
    }

    if (!field.trim()) {
      setError('Please enter your field of study or profession');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/researcher/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          affiliation: affiliation === 'other' ? affiliationOther : affiliation,
          field: field.trim(),
          institution: institution.trim() || null,
        }),
      });

      if (response.ok) {
        router.push('/');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to complete profile');
      }
    } catch (err) {
      console.error('Onboarding error:', err);
      setError('Failed to complete profile');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="text-zinc-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-zinc-900 mb-2">
            Welcome to Austerian
          </h1>
          <p className="text-zinc-600">
            Tell us a bit about yourself to personalize your experience
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-zinc-200 p-8 shadow-sm">
          {/* Affiliation Type */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-zinc-900 mb-3">
              What best describes you? *
            </label>
            <div className="grid grid-cols-2 gap-3">
              {affiliationTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setAffiliation(type.value)}
                  className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-all ${
                    affiliation === type.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <span className="text-2xl">{type.icon}</span>
                  <span className="text-sm font-medium">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Other Affiliation Input */}
          {affiliation === 'other' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-zinc-900 mb-2">
                Please specify *
              </label>
              <input
                type="text"
                value={affiliationOther}
                onChange={(e) => setAffiliationOther(e.target.value)}
                placeholder="e.g., Trader, Analyst, Consultant"
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Field of Study / Profession */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-zinc-900 mb-2">
              Field of study or profession *
            </label>
            <input
              type="text"
              value={field}
              onChange={(e) => setField(e.target.value)}
              placeholder="e.g., Economics, Finance, Business"
              list="field-suggestions"
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <datalist id="field-suggestions">
              {fieldSuggestions.map((suggestion) => (
                <option key={suggestion} value={suggestion} />
              ))}
            </datalist>
          </div>

          {/* Institution (Optional) */}
          {(affiliation === 'student' || affiliation === 'academic') && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-zinc-900 mb-2">
                Institution (optional)
              </label>
              <input
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="e.g., St. Mary's College of Maryland"
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Completing Profile...' : 'Complete Profile'}
          </button>

          {/* Skip Link */}
          <button
            type="button"
            onClick={() => router.push('/')}
            className="mt-3 w-full text-center text-sm text-zinc-600 hover:text-zinc-900"
          >
            Skip for now
          </button>
        </form>
      </div>
    </div>
  );
}
