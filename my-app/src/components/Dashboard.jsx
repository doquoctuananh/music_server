import { useNavigate } from 'react-router-dom';
import { Layout, Button, Card, Row, Col, Space, Tag, Avatar, Dropdown, Empty } from 'antd';
import { LogoutOutlined, AudioOutlined, HeartOutlined, PlayCircleOutlined, UserOutlined } from '@ant-design/icons';

const { Header, Content, Footer } = Layout;

export default function Dashboard() {
  const navigate = useNavigate();
  const userName = localStorage.getItem('userName') || 'User';
  const userEmail = localStorage.getItem('userEmail') || '';
  const role = localStorage.getItem('role') || '';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('role');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    navigate('/login');
  };

  const userMenuItems = [
    {
      key: '1',
      label: 'Đăng Xuất',
      icon: <LogoutOutlined />,
      onClick: handleLogout
    }
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{
        background: 'linear-gradient(135deg, #1890ff 0%, #52c41a 100%)',
        padding: '0 50px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'white' }}>
          🎵 Music App
        </div>

        <Space>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Space style={{ cursor: 'pointer', color: 'white' }}>
              <Avatar style={{ background: '#f5222d' }} icon={<UserOutlined />} />
              <span>{userName}</span>
            </Space>
          </Dropdown>
        </Space>
      </Header>

      <Content style={{ padding: '40px', background: '#f5f5f5' }}>
        <Row gutter={[16, 16]}>
          {/* Welcome Card */}
          <Col span={24}>
            <Card
              style={{
                background: 'linear-gradient(135deg, #1890ff 0%, #52c41a 100%)',
                color: 'white',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
              }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <h2 style={{ color: 'white', margin: 0 }}>Chào mừng trở lại, {userName}! 🎉</h2>
                <p style={{ margin: 0 }}>Email: {userEmail}</p>
                <Tag color="cyan">Quyền: {role}</Tag>
              </Space>
            </Card>
          </Col>

          {/* Music Features */}
          <Col xs={24} sm={12} lg={6}>
            <Card
              hoverable
              style={{ 
                textAlign: 'center', 
                borderRadius: '8px',
                transition: 'all 0.3s'
              }}
            >
              <AudioOutlined style={{ fontSize: '40px', color: '#1890ff' }} />
              <h3 style={{ marginTop: '15px' }}>🎵 Danh Sách Nhạc</h3>
              <p style={{ color: '#666' }}>Khám phá bài hát yêu thích</p>
              <Button type="primary" block>
                Xem Danh Sách
              </Button>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card
              hoverable
              style={{ 
                textAlign: 'center', 
                borderRadius: '8px'
              }}
            >
              <HeartOutlined style={{ fontSize: '40px', color: '#f5222d' }} />
              <h3 style={{ marginTop: '15px' }}>❤️ Yêu Thích</h3>
              <p style={{ color: '#666' }}>Bài hát yêu thích của bạn</p>
              <Button block>
                Xem Yêu Thích
              </Button>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card
              hoverable
              style={{ 
                textAlign: 'center', 
                borderRadius: '8px'
              }}
            >
              <PlayCircleOutlined style={{ fontSize: '40px', color: '#faad14' }} />
              <h3 style={{ marginTop: '15px' }}>▶️ Playlist</h3>
              <p style={{ color: '#666' }}>Tạo playlist riêng</p>
              <Button block>
                Xem Playlist
              </Button>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card
              hoverable
              style={{ 
                textAlign: 'center', 
                borderRadius: '8px'
              }}
            >
              <UserOutlined style={{ fontSize: '40px', color: '#52c41a' }} />
              <h3 style={{ marginTop: '15px' }}>👤 Hồ Sơ</h3>
              <p style={{ color: '#666' }}>Quản lý hồ sơ cá nhân</p>
              <Button block>
                Chỉnh Sửa Hồ Sơ
              </Button>
            </Card>
          </Col>

          {/* Recently Played */}
          <Col span={24}>
            <Card
              title="🎧 Vừa Phát"
              style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}
            >
              <Empty 
                description="Chưa có bài hát nào được phát" 
                style={{ marginTop: '30px', marginBottom: '30px' }}
              />
            </Card>
          </Col>

          {/* Top Tracks */}
          <Col span={24}>
            <Card
              title="⭐ Bài Hát Được Yêu Thích Nhất"
              style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}
            >
              <Empty 
                description="Chưa có dữ liệu" 
                style={{ marginTop: '30px', marginBottom: '30px' }}
              />
            </Card>
          </Col>
        </Row>
      </Content>

      <Footer style={{
        textAlign: 'center',
        background: '#f0f2f5',
        borderTop: '1px solid #d9d9d9'
      }}>
        Music App- Ứng dụng nghe nhạc
      </Footer>
    </Layout>
  );
}
