import { render } from '../utils/test-utils';
import AuthForm from './AuthForm';

describe('AuthForm', () => {
  it('renders login form', () => {
    const { container } = render(<AuthForm mode="login" />);
    // aria-labelでフォームを検索
    const form = container.querySelector('form[aria-label="ログインフォーム"]');
    expect(form).toBeTruthy();
  });

  it('renders signup form', () => {
    const { container } = render(<AuthForm mode="signup" />);
    // aria-labelでフォームを検索
    const form = container.querySelector('form[aria-label="新規登録フォーム"]');
    expect(form).toBeTruthy();
  });

  // snapshot test
  it('matches login snapshot', () => {
    const { asFragment } = render(<AuthForm mode="login" />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('matches signup snapshot', () => {
    const { asFragment } = render(<AuthForm mode="signup" />);
    expect(asFragment()).toMatchSnapshot();
  });
});
