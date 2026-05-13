import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Space, message, Divider, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { userAPI } from '../services/api';

const { Title, Text } = Typography;

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const handleSubmit = async (values) => {
    setLoading(true);

    try {
      const data = await userAPI.login(values.email, values.password);

      if (data.success) {
        // Lưu token, id, và role vào localStorage
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('userId', data.data.user._id);
        localStorage.setItem('role', data.data.user.role);
        localStorage.setItem('userName', data.data.user.name);
        localStorage.setItem('userEmail', data.data.user.email);

        message.success(data.message || 'Đăng nhập thành công!');

        // Chuyển hướng dựa trên role
        if (data.data.user.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      } else {
        message.error(data.message || 'Đăng nhập thất bại');
      }
    } catch (err) {
      message.error('Lỗi kết nối: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      background: 'linear-gradient(135deg, #9c4db7 0%, #5a2d81 50%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      margin: 0,
      boxSizing: 'border-box'
    }}>
      <Card
        style={{
          width: '100%',
          maxWidth: '450px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
        }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <Title level={2} style={{ marginBottom: 0 }}>🎵 Music App</Title>
            <Text type="secondary">Hệ thống quản lý âm nhạc</Text>
          </div>

          <Divider style={{ margin: '10px 0' }} />

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            autoComplete="off"
          >
            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: 'Vui lòng nhập email!' },
                { type: 'email', message: 'Email không hợp lệ!' }
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="admin@musicapp.com"
                size="large"
              />
            </Form.Item>

            <Form.Item
              label="Mật khẩu"
              name="password"
              rules={[
                { required: true, message: 'Vui lòng nhập mật khẩu!' }
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Nhập mật khẩu"
                size="large"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                size="large"
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none'
                }}
              >
                {loading ? 'Đang đăng nhập...' : 'Đăng Nhập'}
              </Button>
            </Form.Item>
          </Form>

          <Divider style={{ margin: '10px 0' }} />

          <div style={{
            background: '#f6f8fb',
            padding: '12px',
            borderRadius: '6px',
            textAlign: 'center'
          }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              <strong>Test Account:</strong><br />
              Email: admin@musicapp.com<br />
              Password: admin123
            </Text>
          </div>
        </Space>
      </Card>
    </div>
  );
}
