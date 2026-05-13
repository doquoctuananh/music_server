import { useState } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { Layout, Menu, Button, Space, Avatar } from 'antd';
import { LogoutOutlined, BarChartOutlined, UserOutlined, AudioOutlined, TeamOutlined, UnorderedListOutlined, SoundOutlined } from '@ant-design/icons';

const { Sider, Header, Content, Footer } = Layout;

export default function Admin() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const userName = localStorage.getItem('userName') || 'Admin';
  const userEmail = localStorage.getItem('userEmail') || '';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('role');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    navigate('/login');
  };

  const handleMenuClick = (e) => {
    const routes = {
      '1': '/admin/statistics',
      '2': '/admin/users',
      '3': '/admin/albums',
      '4': '/admin/artists',
      '5': '/admin/songs',
      '6': null,
    };
    if (routes[e.key]) {
      navigate(routes[e.key]);
    }
  };

  const menuItems = [
    {
      key: '1',
      icon: <BarChartOutlined />,
      label: 'Thống Kê',
    },
    {
      key: '2',
      icon: <UserOutlined />,
      label: 'Người Dùng',
    },
    {
      key: '3',
      icon: <UnorderedListOutlined />,
      label: 'Albums',
    },
    {
      key: '4',
      icon: <TeamOutlined />,
      label: 'Nghệ Sĩ',
    },
    {
      key: '5',
      icon: <SoundOutlined />,
      label: 'Bài Hát',
    },
    {
      type: 'divider',
    },
    {
      key: '6',
      icon: <LogoutOutlined />,
      label: 'Thoát',
      onClick: handleLogout,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        style={{
          background: 'linear-gradient(180deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        <div style={{
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '18px',
          fontWeight: 'bold',
        }}>
          🎵 Music
        </div>
        <Menu
          theme="dark"
          mode="inline"
          defaultSelectedKeys={['1']}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ background: 'transparent' }}
        />
      </Sider>

      <Layout>
        <Header style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <Button
            type="text"
            icon={collapsed ? '☰' : '✕'}
            onClick={() => setCollapsed(!collapsed)}
            style={{ color: 'white', fontSize: '18px' }}
          />
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'white' }}>
            Music Admin Dashboard
          </div>
          <Space style={{ color: 'white' }}>
            <Avatar style={{ background: '#87d068' }} icon={<UserOutlined />} />
            <span>{userName}</span>
          </Space>
        </Header>

        <Content style={{ padding: '24px', background: '#f0f2f5' }}>
          <Outlet />
        </Content>

        <Footer style={{
          textAlign: 'center',
          background: '#f0f2f5',
          borderTop: '1px solid #d9d9d9'
        }}>
          Music App- Bảng điều khiển quản trị
        </Footer>
      </Layout>
    </Layout>
  );
}
