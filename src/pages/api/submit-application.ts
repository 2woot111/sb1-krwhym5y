import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';
import { validateApplication } from '../../lib/validation';
import type { ApplicationData, ApiResponse } from '../../lib/types';

export const POST: APIRoute = async ({ request }) => {
  const headers = {
    'Content-Type': 'application/json'
  };
  
  let requestData;

  try {
    try {
      requestData = await request.json();
    } catch (parseError) {
      console.error('Parse error:', parseError);
      console.error('Parse error:', parseError);
      return new Response(JSON.stringify({
        success: false,
        error: {
          message: 'Invalid request data',
          details: 'Failed to parse request body as JSON'
        }
      }), { status: 400, headers });
    }

    const formData: ApplicationData = requestData;

    // Validate form data
    try {
      validateApplication(formData);
    } catch (validationError: any) {
      console.error('Validation error:', validationError);
      console.error('Validation error:', validationError);
      const response: ApiResponse = {
        success: false,
        error: {
          message: validationError.message,
          details: validationError.details
        }
      };
      return new Response(JSON.stringify(response), { status: 400, headers });
    }

    // Check if the application meets the requirements
    const meetsRequirements = 
      formData.is_undergraduate &&
      formData.can_access_student_list &&
      (formData.student_list_confidence ?? 0) >= 7 &&
      formData.has_admissions_contact &&
      (formData.admissions_contact_confidence ?? 0) >= 7 &&
      formData.response_speed >= 7;

    // Insert application into database
    const { error } = await supabase
      .from('applications')
      .insert([{
        is_undergraduate: formData.is_undergraduate,
        current_year: formData.current_year || null,
        major: formData.major || null,
        can_access_student_list: formData.can_access_student_list,
        student_list_confidence: formData.student_list_confidence || null,
        has_admissions_contact: formData.has_admissions_contact,
        admissions_contact_confidence: formData.admissions_contact_confidence || null,
        response_speed: formData.response_speed
      }]);

    if (error) {
      console.error('Supabase error:', error);
      
      // Check for specific Supabase errors
      const errorMessage = error.code === '23502' ? 
        'Missing required fields' : 
        error.message || 'Database error';
        
      const response: ApiResponse = {
        success: false,
        error: {
          message: 'Failed to save application: ' + errorMessage,
          details: error.code
        }
      };
      return new Response(JSON.stringify(response), { status: 500, headers });
    }

    const response: ApiResponse = {
      success: true,
      meetsRequirements
    };

    return new Response(JSON.stringify(response), { status: 200, headers });
  } catch (error) {
    console.error('Error submitting application:', error);
    
    const response: ApiResponse = {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to save application'
      }
    };

    return new Response(JSON.stringify(response), { status: 500, headers });
  }
};