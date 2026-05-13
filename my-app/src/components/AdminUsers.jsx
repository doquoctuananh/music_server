import { Table, Button, Space, Modal, Form, Input, Card, message, Upload, Avatar, Descriptions, Spin } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, UploadOutlined, EyeOutlined } from '@ant-design/icons';
import { useState, useEffect } from 'react';
import { userAPI } from '../services/api';

export default function AdminUsers() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [detailUser, setDetailUser] = useState(null);
  const [editImageFile, setEditImageFile] = useState(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 6,
    total: 0,
  });

  // Định nghĩa columns bên trong component để có access đến showDeleteConfirm
  const columns = [
    {
      title: 'Tên',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Quyền',
      dataIndex: 'role',
      key: 'role',
      render: (role) => {
        const colors = { admin: 'red', member: 'blue', user: 'green' };
        return <span style={{ color: colors[role] || 'black' }}>{role}</span>;
      },
    },
    {
      title: 'Ngày Tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => new Date(date).toLocaleDateString('vi-VN'),
    },
    {
      title: 'Hành Động',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button icon={<EyeOutlined />} type="default" size="small" onClick={() => showDetailModal(record._id)}>Xem</Button>
          <Button icon={<EditOutlined />} type="primary" size="small" onClick={() => showEditModal(record)}>Sửa</Button>
          <Button 
            icon={<DeleteOutlined />} 
            danger 
            size="small"
            onClick={() => showDeleteConfirm(record._id, record.name)}
          >
            Xóa
          </Button>
        </Space>
      ),
    },
  ];

  useEffect(() => {
    fetchUsers(pagination.current, pagination.pageSize);
  }, []);

  const fetchUsers = async (page = 1, limit = 6) => {
    setDataLoading(true);
    try {
      const response = await userAPI.getUsers(page, limit);
      console.log('API Response:', response);
      if (response.success) {
        // API trả về {users: [], pagination: {...}}, lọc ra những user không phải admin
        const usersArray = response.data?.users && Array.isArray(response.data.users)
          ? response.data.users.filter(user => user.role !== 'admin')
          : [];
        setUsers(usersArray);
        
        // Sử dụng total từ API (API đã handle pagination server-side)
        setPagination({
          current: response.data?.pagination?.page || page,
          pageSize: response.data?.pagination?.limit || limit,
          total: response.data?.pagination?.total || 0,
        });
      } else {
        message.error(response.message || 'Lỗi lấy danh sách người dùng');
      }
    } catch (err) {
      message.error('Lỗi: ' + err.message);
    } finally {
      setDataLoading(false);
    }
  };

  const handleTableChange = (newPagination) => {
    fetchUsers(newPagination.current, newPagination.pageSize);
  };

  const showDeleteConfirm = (userId, userName) => {
    Modal.confirm({
      title: 'Xác nhận xóa',
      content: `Bạn có chắc chắn muốn xóa người dùng "${userName}" không?`,
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk() {
        handleDelete(userId);
      },
    });
  };

  const handleDelete = async (userId) => {
    try {
      setLoading(true);
      const response = await userAPI.deleteUser(userId);
      
      if (response.success) {
        message.success('Xóa người dùng thành công!');
        fetchUsers(pagination.current, pagination.pageSize);
      } else {
        message.error(response.message || 'Lỗi xóa người dùng');
      }
    } catch (err) {
      message.error('Lỗi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const showDetailModal = async (userId) => {
    setDetailLoading(true);
    try {
      const response = await userAPI.getUser(userId);
      if (response.success) {
        setDetailUser(response.data.user);
        setIsDetailModalOpen(true);
      } else {
        message.error(response.message || 'Lỗi lấy chi tiết người dùng');
      }
    } catch (err) {
      message.error('Lỗi: ' + err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const showEditModal = (user) => {
    setEditingUser(user);
    editForm.setFieldsValue({
      name: user.name,
      email: user.email,
      image: [],
    });
    setIsEditModalOpen(true);
  };

  const handleEditCancel = () => {
    setIsEditModalOpen(false);
    setEditingUser(null);
    setEditImageFile(null);
    editForm.resetFields();
  };

  const handleEditOk = async () => {
    try {
      const values = await editForm.validateFields();
      setLoading(true);

      const editData = {
        name: values.name,
        email: values.email,
      };

      // Thêm ảnh nếu có (từ state, không từ form values)
      if (editImageFile) {
        editData.image = editImageFile;
      }

      const response = await userAPI.updateUser(editingUser._id, editData);

      if (response.success) {
        message.success('Sửa người dùng thành công!');
        setIsEditModalOpen(false);
        setEditingUser(null);
        setEditImageFile(null);
        editForm.resetFields();
        fetchUsers(pagination.current, pagination.pageSize);
      } else {
        // Kiểm tra lỗi email trùng
        if (response.errors?.errorCode === 'EMAIL_DUPLICATE') {
          message.error('Email đã tồn tại. Vui lòng sử dụng email khác.');
          editForm.setFields([
            {
              name: 'email',
              errors: ['Email đã tồn tại'],
            },
          ]);
        } else {
          message.error(response.message || 'Lỗi sửa người dùng');
        }
      }
    } catch (err) {
      if (err.errorFields) {
        return;
      }
      message.error('Lỗi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const showModal = () => {
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const createData = {
        name: values.name,
        email: values.email,
        password: values.password,
        role: 'member',
      };

      // Thêm ảnh nếu có
      if (values.image && values.image.length > 0) {
        createData.image = values.image[0].originFileObj;
      }

      const response = await userAPI.createUser(createData);

      if (response.success) {
        message.success('Tạo người dùng thành công!');
        setIsModalOpen(false);
        form.resetFields();
        fetchUsers(pagination.current, pagination.pageSize);
      } else {
        // Kiểm tra lỗi email trùng
        if (response.errors?.errorCode === 'EMAIL_DUPLICATE') {
          message.error('Email đã tồn tại. Vui lòng sử dụng email khác.');
          form.setFields([
            {
              name: 'email',
              errors: ['Email đã tồn tại'],
            },
          ]);
        } else {
          message.error(response.message || 'Lỗi tạo người dùng');
        }
      }
    } catch (err) {
      if (err.errorFields) {
        return;
      }
      message.error('Lỗi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    form.resetFields();
  };

  return (
    <div>
      <Card
        style={{ marginBottom: '20px' }}
        title="👥 Quản Lý Người Dùng"
        extra={
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={showModal}
          >
            Thêm Người Dùng
          </Button>
        }
      >
        <Table 
          columns={columns} 
          dataSource={users}
          loading={dataLoading}
          pagination={pagination}
          onChange={handleTableChange}
          rowKey="_id"
        />
      </Card>

      <Modal
        title="Thêm Người Dùng Mới"
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleCancel}
        confirmLoading={loading}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            label="Tên"
            name="name"
            rules={[{ required: true, message: 'Vui lòng nhập tên!' }]}
          >
            <Input placeholder="Nguyễn Văn A" />
          </Form.Item>
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Vui lòng nhập email!' },
              { type: 'email', message: 'Email không hợp lệ!' }
            ]}
          >
            <Input placeholder="tuan@gmail.com" />
          </Form.Item>
          <Form.Item
            label="Mật khẩu"
            name="password"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu!' },
              { min: 8, message: 'Mật khẩu phải ít nhất 8 ký tự!' }
            ]}
          >
            <Input.Password placeholder="tuan123456" />
          </Form.Item>
          <Form.Item
            label="Ảnh đại diện (Tùy chọn)"
            name="image"
            rules={[]}
          >
            <Upload
              maxCount={1}
              beforeUpload={() => false}
              accept="image/*"
            >
              <Button icon={<UploadOutlined />}>Chọn ảnh</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Sửa Người Dùng"
        open={isEditModalOpen}
        onOk={handleEditOk}
        onCancel={handleEditCancel}
        confirmLoading={loading}
      >
        <Form
          form={editForm}
          layout="vertical"
        >
          <Form.Item
            label="Tên"
            name="name"
            rules={[{ required: true, message: 'Vui lòng nhập tên!' }]}
          >
            <Input placeholder="Nguyễn Văn A" />
          </Form.Item>
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Vui lòng nhập email!' },
              { type: 'email', message: 'Email không hợp lệ!' }
            ]}
          >
            <Input placeholder="user@gmail.com" />
          </Form.Item>
          <Form.Item
            label="Ảnh đại diện (Tùy chọn)"
            name="image"
            rules={[]}
          >
            <Upload
              maxCount={1}
              beforeUpload={() => false}
              accept="image/*"
              onChange={(info) => {
                if (info.fileList.length > 0) {
                  const file = info.fileList[0];
                  setEditImageFile(file.originFileObj || file);
                } else {
                  setEditImageFile(null);
                }
              }}
            >
              <Button icon={<UploadOutlined />}>Chọn ảnh mới</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Chi Tiết Người Dùng"
        open={isDetailModalOpen}
        onCancel={() => setIsDetailModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsDetailModalOpen(false)}>
            Đóng
          </Button>,
        ]}
        width={600}
      >
        <Spin spinning={detailLoading}>
          {detailUser && (
            <div style={{ textAlign: 'center' }}>
              {detailUser.imageURL && detailUser.imageURL.trim() !== '' ? (
                <Avatar
                  size={120}
                  src={`http://localhost:4000${detailUser.imageURL}`}
                  style={{ marginBottom: '20px' }}
                />
              ) : (
                <div style={{ marginBottom: '20px', fontSize: '16px', color: '#999' }}>
                  Không có ảnh đại diện
                </div>
              )}
              <Descriptions
                bordered
                column={1}
                style={{ marginTop: '20px' }}
              >
                <Descriptions.Item label="Tên">
                  {detailUser.name}
                </Descriptions.Item>
                <Descriptions.Item label="Email">
                  {detailUser.email}
                </Descriptions.Item>
                <Descriptions.Item label="Vai Trò">
                  <span style={{ color: { admin: 'red', member: 'blue', user: 'green' }[detailUser.role] || 'black' }}>
                    {detailUser.role}
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="Ngày Tạo">
                  {new Date(detailUser.createdAt).toLocaleString('vi-VN')}
                </Descriptions.Item>
                <Descriptions.Item label="Ngày Cập Nhật">
                  {new Date(detailUser.updatedAt).toLocaleString('vi-VN')}
                </Descriptions.Item>
              </Descriptions>
            </div>
          )}
        </Spin>
      </Modal>
    </div>
  );
}
