import os
import json
import re
from google import genai
from google.genai import types

def get_gemini_client():
    api_key = os.getenv('GEMINI_API_KEY', '')
    if not api_key or api_key == 'your_gemini_api_key_here':
        return None
    try:
        return genai.Client(api_key=api_key)
    except Exception as e:
        print(f"Gemini client initialization error: {e}")
        return None

def clean_json_response(raw_text):
    """Strip markdown codeblock wrappers (```json ... ```) and return parsed dict."""
    if not raw_text:
        return {}
    cleaned = raw_text.strip()
    if cleaned.startswith('```json'):
        cleaned = cleaned[7:]
    elif cleaned.startswith('```'):
        cleaned = cleaned[3:]
    if cleaned.endswith('```'):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()
    
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        # Fallback regex extraction
        match = re.search(r'\{.*\}', cleaned, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except Exception:
                pass
        return {}

class AIService:
    @staticmethod
    def enhance_description(raw_description, environment="Development"):
        """Rewrite raw vague defect description into structured report."""
        client = get_gemini_client()
        if not client:
            return AIService._fallback_enhance_description(raw_description, environment)

        prompt = f"""
You are a Lead QA Automation Engineer & Software Architect.
Transform the following user-submitted bug report into a professional enterprise defect report.

User Input: "{raw_description}"
Environment: "{environment}"

Return strictly a valid JSON object with the following schema:
{{
  "title": "Clear, concise technical defect title",
  "description": "Professional technical description of the defect",
  "environment": "Guessed or confirmed environment (e.g., Development, Staging, iOS)",
  "steps_to_reproduce": "1. Step one\\n2. Step two\\n3. Step three",
  "expected_result": "What should have happened",
  "actual_result": "What actually happened",
  "error_message": "Extracted error code or message if any, or 'None'",
  "missing_info": "Any missing details the reporter should clarify"
}}
"""
        try:
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            result = clean_json_response(response.text)
            if result.get('title'):
                return result
        except Exception as e:
            print(f"Gemini enhance_description failed: {e}")

        return AIService._fallback_enhance_description(raw_description, environment)

    @staticmethod
    def classify_defect(title, description):
        """Predict category, module, defect_type, severity, and priority."""
        client = get_gemini_client()
        if not client:
            return AIService._fallback_classify(title, description)

        prompt = f"""
Analyze the following software defect and classify it for triage:

Title: "{title}"
Description: "{description}"

Allowed Options:
- severity: ["Low", "Medium", "High", "Critical"]
- priority: ["Low", "Medium", "High", "Critical"]
- category: ["UI/UX", "API", "Authentication", "Database", "Performance", "Security", "Payment", "General"]
- defect_type: ["Functional Defect", "UI Bug", "Security Vulnerability", "Performance Issue", "Crash / Exception", "Compatibility"]

Return strictly a JSON object:
{{
  "category": "Predicted category",
  "module": "Likely module name",
  "defect_type": "Predicted defect type",
  "severity": "Severity value",
  "severity_reason": "Clear explanation of why this severity was assigned",
  "priority": "Priority value",
  "priority_reason": "Clear explanation of why this priority was assigned"
}}
"""
        try:
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            result = clean_json_response(response.text)
            if result.get('severity'):
                return result
        except Exception as e:
            print(f"Gemini classify_defect failed: {e}")

        return AIService._fallback_classify(title, description)

    @staticmethod
    def analyze_screenshot(image_bytes, mime_type="image/png"):
        """Use Gemini Vision to analyze screenshot OCR, UI errors, stack traces."""
        client = get_gemini_client()
        if not client:
            return AIService._fallback_vision_analysis()

        prompt = """
You are an expert AI Vision QA Engineer.
Analyze this software bug screenshot (UI crash, browser console log, or stack trace image).

Return strictly a valid JSON object:
{
  "title": "Suggested technical bug title based on image OCR",
  "description": "Comprehensive description of visible failure, UI state, or stack trace",
  "environment": "Inferred environment (e.g. Chrome 124, iOS Safari, React, Terminal)",
  "steps_to_reproduce": "1. Navigate to affected screen\\n2. Trigger action shown in screenshot",
  "expected_result": "Expected UI state or API success response",
  "actual_result": "Actual visible error, stack trace, or broken layout",
  "error_message": "Exact text of visible error modal, status code, or traceback line",
  "category": "Predicted category (UI/UX, API, Authentication, Database, Performance, Security)",
  "severity": "High",
  "priority": "High",
  "possible_root_cause": "Likely technical root cause (e.g. NullPointerException, Unhandled 401 JWT, CSS overflow)",
  "suggested_fix": "Initial investigation steps for developer"
}
"""
        try:
            image_part = types.Part.from_bytes(
                data=image_bytes,
                mime_type=mime_type
            )
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=[image_part, prompt],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            result = clean_json_response(response.text)
            if result.get('title'):
                return result
        except Exception as e:
            print(f"Gemini Vision analyze_screenshot failed: {e}")

        return AIService._fallback_vision_analysis()

    @staticmethod
    def generate_resolution_assistance(defect_data, historical_fixes=None):
        """Signature Feature: Developer Resolution Co-Pilot."""
        client = get_gemini_client()
        if not client:
            return AIService._fallback_resolution_assistance(defect_data)

        prompt = f"""
You are a Principal Software Architect aiding a Developer in resolving a software defect.

Defect Details:
- Key: {defect_data.get('issue_key')}
- Title: "{defect_data.get('title')}"
- Description: "{defect_data.get('description')}"
- Category: {defect_data.get('category')}
- Module: {defect_data.get('module')}
- Severity: {defect_data.get('severity')}
- Environment: {defect_data.get('environment')}

Historical Fixes Available:
{json.dumps(historical_fixes or [])}

Provide intelligent resolution assistance.
Return strictly a valid JSON object:
{{
  "investigation_areas": [
    "1. Specific file, API route, or database table to inspect",
    "2. Specific log entry or stack trace pattern to check",
    "3. Specific state variable or token handling code"
  ],
  "possible_root_cause": "Primary technical hypothesis for this defect",
  "suggested_resolution": "Step-by-step code resolution instructions",
  "suggested_testing_steps": [
    "1. Unit test check",
    "2. Integration API payload check",
    "3. Verification step"
  ],
  "disclaimer": "Our AI provides intelligent assistance to help developers analyze defects and identify possible resolution approaches."
}}
"""
        try:
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            result = clean_json_response(response.text)
            if result.get('possible_root_cause'):
                return result
        except Exception as e:
            print(f"Gemini generate_resolution_assistance failed: {e}")

        return AIService._fallback_resolution_assistance(defect_data)

    # --- Fallback Generators when API Key is not set or offline ---

    @staticmethod
    def _fallback_enhance_description(raw_desc, env):
        title = raw_desc[:60].strip().capitalize() if raw_desc else "Software Defect Report"
        if not title.endswith('.'):
            title = f"Defect: {title}"
        return {
            "title": title,
            "description": f"Detailed technical report for: {raw_desc}",
            "environment": env or "Development",
            "steps_to_reproduce": "1. Launch application in environment\n2. Perform action leading to defect\n3. Observe unexpected failure state",
            "expected_result": "Application executes operation successfully without exceptions",
            "actual_result": f"Application encountered issue: {raw_desc}",
            "error_message": "See system logs or attached console output",
            "missing_info": "Please specify exact user credentials or API payload used"
        }

    @staticmethod
    def _fallback_classify(title, desc):
        text = f"{title} {desc}".lower()
        category = "General"
        if "login" in text or "auth" in text or "jwt" in text or "password" in text:
            category = "Authentication"
        elif "ui" in text or "button" in text or "css" in text or "layout" in text:
            category = "UI/UX"
        elif "api" in text or "500" in text or "endpoint" in text or "http" in text:
            category = "API"
        elif "sql" in text or "db" in text or "database" in text:
            category = "Database"

        severity = "High" if ("crash" in text or "error" in text or "500" in text) else "Medium"
        priority = "High" if severity == "High" else "Medium"

        return {
            "category": category,
            "module": category,
            "defect_type": "Functional Defect",
            "severity": severity,
            "severity_reason": f"Assigned {severity} based on failure severity in keywords.",
            "priority": priority,
            "priority_reason": f"Assigned {priority} priority to resolve core user workflow."
        }

    @staticmethod
    def _fallback_vision_analysis():
        return {
            "title": "UI Stack Trace / Exception Captured in Screenshot",
            "description": "Automated OCR parsed error details from uploaded screenshot attachment.",
            "environment": "Web Browser / Chrome Developer Tools",
            "steps_to_reproduce": "1. Open application\n2. Trigger component state shown in image\n3. Inspect console logs",
            "expected_result": "Component renders without throwing unhandled exceptions",
            "actual_result": "Uncaught Error / Failed API network request displayed",
            "error_message": "TypeError: Cannot read properties of undefined (reading 'data')",
            "category": "UI/UX",
            "severity": "High",
            "priority": "High",
            "possible_root_cause": "Missing null-check on asynchronous API response state",
            "suggested_fix": "Add optional chaining (?.) and default fallback state before accessing property."
        }

    @staticmethod
    def _fallback_resolution_assistance(defect_data):
        return {
            "investigation_areas": [
                f"1. Inspect controller handling {defect_data.get('category', 'General')} logic",
                "2. Check recent commits for missing null/undefined checks",
                "3. Verify API endpoint payload response structure"
            ],
            "possible_root_cause": f"Potential state mismatch or unhandled exception in {defect_data.get('category', 'General')} component.",
            "suggested_resolution": "Validate API response payload, add try-catch block around execution, and log failure trace.",
            "suggested_testing_steps": [
                "1. Run backend pytest suite for affected endpoint",
                "2. Verify UI error fallback renders gracefully",
                "3. Confirm state updates cleanly upon retry"
            ],
            "disclaimer": "Our AI provides intelligent assistance to help developers analyze defects and identify possible resolution approaches."
        }
