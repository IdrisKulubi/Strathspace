# Tinder-Style UI Refactor Plan

## 1. Design System & Layout Foundation
- Set up Tailwind CSS for mobile-first, responsive design.
- Define color palette, spacing, and typography to match Tinder's modern look.
- Integrate Shadcn UI and Radix UI for accessible, composable primitives.
- Establish a layout shell: sidebar (left), main content (center), action bar (bottom on mobile).

## 2. Card Stack / Swipeable Cards
- Implement a swipeable card stack for user profiles.
  - Use a custom hook or a library for drag/swipe gestures.
  - Each card displays profile photo(s), name, age, badges, and key info.
  - Animate card transitions (swipe left/right/up for actions).
- Ensure cards are accessible (keyboard, ARIA).

## 3. Action Button Group
- Add floating action buttons below the card stack:
  - Nope (X), Like (heart), Super Like (star), Rewind (undo)
  - Use Shadcn/Radix Button components with custom icons.
  - Ensure buttons are large, touch-friendly, and accessible.

## 4. Profile Details Overlay/Modal
- On card tap/click, show a modal/overlay with full profile details.
  - Carousel for multiple photos (Radix Dialog/Sheet + Carousel)
  - Show bio, interests, lifestyle, verification, etc.
  - Add "Show More" and "Close" actions.

## 5. Sidebar Navigation (Matches/Messages)
- Implement a sidebar (drawer on mobile) for navigation:
  - Tabs for Matches and Messages
  - List of matches with avatars and status
  - Responsive: collapses to icons on mobile

## 6. Profile Completion & Verification UI
- Add a profile completion bar (progress + percentage).
- Show verification badge on profiles.
- Prompt users to complete missing sections.

## 7. Responsive & Accessibility Enhancements
- Ensure all components are keyboard navigable.
- Add ARIA labels/roles to interactive elements.
- Test color contrast and focus states.
- Optimize layout for all breakpoints (mobile, tablet, desktop).

## 8. Theming & Polish
- Use Tailwind CSS variables for easy theming.
- Polish spacing, shadows, and transitions for a modern feel.
- Add subtle animations for card swipes and button presses.

## 9. Testing & Validation
- Test UI on multiple devices and browsers.
- Validate accessibility with screen readers.
- Write unit/integration tests for key components (React Testing Library).

---

### References
- [Tinder UI Inspiration](https://jamesrochabrun.medium.com/lets-create-a-tinder-like-swipe-using-nslayoutanchors-custom-views-and-protocol-extensions-3be852f94e1d)
- [Shadcn UI](https://ui.shadcn.com/)
- [Radix UI](https://www.radix-ui.com/)
