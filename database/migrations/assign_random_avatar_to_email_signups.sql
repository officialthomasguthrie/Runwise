-- Migration: Assign random profile picture to email/password signups
-- This assigns a random avatar from Profile2.jpg, Profile3.jpg, or Profile4.jpg
-- to users who sign up via email/password (not OAuth)

-- Update handle_new_user function to assign random avatar for email/password signups
-- This function must match the structure from give_free_users_initial_credits.sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    random_avatar_url TEXT;
    oauth_avatar_url TEXT;
    email_sum INTEGER := 0;
    email_chars TEXT;
    i INTEGER;
BEGIN
    -- Check if avatar_url is already set in metadata (from signUp function or OAuth)
    oauth_avatar_url := COALESCE(NEW.raw_user_meta_data->>'avatar_url', '');
    
    -- If avatar_url is already set, use it (either from OAuth or from signUp function)
    IF oauth_avatar_url != '' THEN
        random_avatar_url := oauth_avatar_url;
    ELSE
        -- No avatar set - assign random one for email/password signups
        -- Calculate sum of ASCII values of email characters for consistent assignment
        email_chars := COALESCE(NEW.email, '');
        IF length(email_chars) > 0 THEN
            FOR i IN 1..length(email_chars) LOOP
                email_sum := email_sum + ascii(substring(email_chars from i for 1));
            END LOOP;
        END IF;
        
        -- Select one of the three profile images based on email hash
        IF (abs(email_sum) % 3) = 0 THEN
            random_avatar_url := '/Profile2.jpg';
        ELSIF (abs(email_sum) % 3) = 1 THEN
            random_avatar_url := '/Profile3.jpg';
        ELSE
            random_avatar_url := '/Profile4.jpg';
        END IF;
    END IF;
    
    -- Insert user record with avatar_url
    INSERT INTO public.users (
        id, 
        email, 
        first_name, 
        last_name,
        avatar_url,
        subscription_tier,
        credits_balance,
        credits_used_this_month,
        credits_last_reset,
        total_credits_used
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        random_avatar_url,
        'free',
        5,
        0,
        NOW(),
        0
    )
    ON CONFLICT (id) DO NOTHING;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the trigger (allows user creation to proceed)
        RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
        RETURN NEW;
END;
$$;

COMMENT ON FUNCTION handle_new_user() IS 'Creates user record on signup. Assigns random avatar (Profile2.jpg, Profile3.jpg, or Profile4.jpg) to email/password signups. OAuth users keep their provider avatar.';

