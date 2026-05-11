update public.reference_analyses
set summary = 'No reference websites were supplied. Use the saved brief, approved palette system, selected design direction, font system, visual dislikes, and brand notes as the style contract.'
where status = 'skipped';
