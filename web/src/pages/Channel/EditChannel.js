import React, { useEffect, useState } from 'react';
import { Button, Form, Header, Input, Message, Segment } from 'semantic-ui-react';
import { useNavigate, useParams } from 'react-router-dom';
import { API, showError, showInfo, showSuccess, verifyJSON } from '../../helpers';
import { CHANNEL_OPTIONS } from '../../constants';

const MODEL_MAPPING_EXAMPLE = {
  'gpt-3.5-turbo-0301': 'gpt-3.5-turbo',
  'gpt-4-0314': 'gpt-4',
  'gpt-4-32k-0314': 'gpt-4-32k'
};

function type2secretPrompt(type) {
  // inputs.type === 15 ? '按照如下格式输入：APIKey|SecretKey' : (inputs.type === 18 ? '按照如下格式输入：APPID|APISecret|APIKey' : '请输入渠道对应的鉴权密钥')
  switch (type) {
    case 15:
      return '按照如下格式输入：APIKey|SecretKey';
    case 18:
      return '按照如下格式输入：APPID|APISecret|APIKey';
    case 22:
      return '按照如下格式输入：APIKey-AppId，例如：fastgpt-0sp2gtvfdgyi4k30jwlgwf1i-64f335d84283f05518e9e041';
    default:
      return '请输入渠道对应的鉴权密钥';
  }
}

const EditChannel = () => {
  const params = useParams();
  const navigate = useNavigate();
  const channelId = params.id;
  const isEdit = channelId !== undefined;
  const [loading, setLoading] = useState(isEdit);
  const handleCancel = () => {
    navigate('/channel');
  };

  const originInputs = {
    name: '',
    type: 1,
    key: '',
    base_url: '',
    other: '',
    model_mapping: '',
    models: [],
    groups: ['default']
  };
  const [batch, setBatch] = useState(false);
  const [inputs, setInputs] = useState(originInputs);
  const [originModelOptions, setOriginModelOptions] = useState([]);
  const [modelOptions, setModelOptions] = useState([]);
  const [groupOptions, setGroupOptions] = useState([]);
  const [basicModels, setBasicModels] = useState([]);
  const [fullModels, setFullModels] = useState([]);
  const [customModel, setCustomModel] = useState('');
  const handleInputChange = (e, { name, value }) => {
    setInputs((inputs) => ({ ...inputs, [name]: value }));
    if (name === 'type' && inputs.models.length === 0) {
      let localModels = [];
      switch (value) {
        case 14:
          localModels = ['claude-instant-1', 'claude-2'];
          break;
        case 11:
          localModels = ['PaLM-2'];
          break;
        case 15:
          localModels = ['ERNIE-Bot', 'ERNIE-Bot-turbo', 'Embedding-V1'];
          break;
        case 17:
          localModels = ['qwen-v1', 'qwen-plus-v1', 'text-embedding-v1'];
          break;
        case 16:
          localModels = ['chatglm_pro', 'chatglm_std', 'chatglm_lite'];
          break;
        case 18:
          localModels = ['SparkDesk'];
          break;
        case 19:
          localModels = ['360GPT_S2_V9', 'embedding-bert-512-v1', 'embedding_s1_v1', 'semantic_similarity_s1_v1', '360GPT_S2_V9.4'];
          break;
      }
      setInputs((inputs) => ({ ...inputs, models: localModels }));
    }
  };

  const loadChannel = async () => {
    let res = await API.get(`/api/channel/${channelId}`);
    const { success, message, data } = res.data;
    if (success) {
      if (data.models === '') {
        data.models = [];
      } else {
        data.models = data.models.split(',');
      }
      if (data.group === '') {
        data.groups = [];
      } else {
        data.groups = data.group.split(',');
      }
      if (data.model_mapping !== '') {
        data.model_mapping = JSON.stringify(JSON.parse(data.model_mapping), null, 2);
      }
      setInputs(data);
    } else {
      showError(message);
    }
    setLoading(false);
  };

  const fetchModels = async () => {
    try {
      let res = await API.get(`/api/channel/models`);
      let localModelOptions = res.data.data.map((model) => ({
        key: model.id,
        text: model.id,
        value: model.id
      }));
      setOriginModelOptions(localModelOptions);
      setFullModels(res.data.data.map((model) => model.id));
      setBasicModels(res.data.data.filter((model) => {
        return model.id.startsWith('gpt-3') || model.id.startsWith('text-');
      }).map((model) => model.id));
    } catch (error) {
      showError(error.message);
    }
  };

  const fetchGroups = async () => {
    try {
      let res = await API.get(`/api/group/`);
      setGroupOptions(res.data.data.map((group) => ({
        key: group,
        text: group,
        value: group
      })));
    } catch (error) {
      showError(error.message);
    }
  };

  useEffect(() => {
    let localModelOptions = [...originModelOptions];
    inputs.models.forEach((model) => {
      if (!localModelOptions.find((option) => option.key === model)) {
        localModelOptions.push({
          key: model,
          text: model,
          value: model
        });
      }
    });
    setModelOptions(localModelOptions);
  }, [originModelOptions, inputs.models]);

  useEffect(() => {
    if (isEdit) {
      loadChannel().then();
    }
    fetchModels().then();
    fetchGroups().then();
  }, []);

  const submit = async () => {
    if (!isEdit && (inputs.name === '' || inputs.key === '')) {
      showInfo('请填写渠道名称和渠道密钥！');
      return;
    }
    if (inputs.models.length === 0) {
      showInfo('请至少选择一个模型！');
      return;
    }
    if (inputs.model_mapping !== '' && !verifyJSON(inputs.model_mapping)) {
      showInfo('模型映射必须是合法的 JSON 格式！');
      return;
    }
    let localInputs = inputs;
    if (localInputs.base_url && localInputs.base_url.endsWith('/')) {
      localInputs.base_url = localInputs.base_url.slice(0, localInputs.base_url.length - 1);
    }
    if (localInputs.type === 3 && localInputs.other === '') {
      localInputs.other = '2023-06-01-preview';
    }
    if (localInputs.type === 18 && localInputs.other === '') {
      localInputs.other = 'v2.1';
    }
    let res;
    localInputs.models = localInputs.models.join(',');
    localInputs.group = localInputs.groups.join(',');
    if (isEdit) {
      res = await API.put(`/api/channel/`, { ...localInputs, id: parseInt(channelId) });
    } else {
      res = await API.post(`/api/channel/`, localInputs);
    }
    const { success, message } = res.data;
    if (success) {
      if (isEdit) {
        showSuccess('渠道更新成功！');
      } else {
        showSuccess('渠道创建成功！');
        setInputs(originInputs);
      }
    } else {
      showError(message);
    }
  };

  const addCustomModel = () => {
    if (customModel.trim() === '') return;
    if (inputs.models.includes(customModel)) return;
    let localModels = [...inputs.models];
    localModels.push(customModel);
    let localModelOptions = [];
    localModelOptions.push({
      key: customModel,
      text: customModel,
      value: customModel
    });
    setModelOptions(modelOptions => {
      return [...modelOptions, ...localModelOptions];
    });
    setCustomModel('');
    handleInputChange(null, { name: 'models', value: localModels });
  };

  return (
    <>
      <Segment loading={loading}>
        <Header as='h3'>{isEdit ? '更新渠道信息' : '创建新的渠道'}</Header>
        <Form autoComplete='new-password'>
          <Form.Field>
            <Form.Select
              label='类型'
              name='type'
              required
              options={CHANNEL_OPTIONS}
              value={inputs.type}
              onChange={handleInputChange}
            />
          </Form.Field>
          {
            inputs.type === 3 && (
              <>
                <Message>
                  注意，<strong>模型部署名称必须和模型名称保持一致</strong>，因为 One API 会把请求体中的 model
                  参数替换为你的部署名称（模型名称中的点会被剔除），<a target='_blank'
                                                                    href='https://github.com/songquanpeng/one-api/issues/133?notification_referrer_id=NT_kwDOAmJSYrM2NjIwMzI3NDgyOjM5OTk4MDUw#issuecomment-1571602271'>图片演示</a>。
                </Message>
                <Form.Field>
                  <Form.Input
                    label='AZURE_OPENAI_ENDPOINT'
                    name='base_url'
                    placeholder={'请输入 AZURE_OPENAI_ENDPOINT，例如：https://docs-test-001.openai.azure.com'}
                    onChange={handleInputChange}
                    value={inputs.base_url}
                    autoComplete='new-password'
                  />
                </Form.Field>
                <Form.Field>
                  <Form.Input
                    label='默认 API 版本'
                    name='other'
                    placeholder={'请输入默认 API 版本，例如：2023-06-01-preview，该配置可以被实际的请求查询参数所覆盖'}
                    onChange={handleInputChange}
                    value={inputs.other}
                    autoComplete='new-password'
                  />
                </Form.Field>
              </>
            )
          }
          {
            inputs.type === 8 && (
              <Form.Field>
                <Form.Input
                  label='Base URL'
                  name='base_url'
                  placeholder={'请输入自定义渠道的 Base URL，例如：https://openai.justsong.cn'}
                  onChange={handleInputChange}
                  value={inputs.base_url}
                  autoComplete='new-password'
                />
              </Form.Field>
            )
          }
          <Form.Field>
            <Form.Input
              label='名称'
              required
              name='name'
              placeholder={'请为渠道命名'}
              onChange={handleInputChange}
              value={inputs.name}
              autoComplete='new-password'
            />
          </Form.Field>
          <Form.Field>
            <Form.Dropdown
              label='分组'
              placeholder={'请选择可以使用该渠道的分组'}
              name='groups'
              required
              fluid
              multiple
              selection
              allowAdditions
              additionLabel={'请在系统设置页面编辑分组倍率以添加新的分组：'}
              onChange={handleInputChange}
              value={inputs.groups}
              autoComplete='new-password'
              options={groupOptions}
            />
          </Form.Field>
          {
            inputs.type === 18 && (
              <Form.Field>
                <Form.Input
                  label='模型版本'
                  name='other'
                  placeholder={'请输入星火大模型版本，注意是接口地址中的版本号，例如：v2.1'}
                  onChange={handleInputChange}
                  value={inputs.other}
                  autoComplete='new-password'
                />
              </Form.Field>
            )
          }
          {
            inputs.type === 21 && (
              <Form.Field>
                <Form.Input
                  label='知识库 ID'
                  name='other'
                  placeholder={'请输入知识库 ID，例如：123456'}
                  onChange={handleInputChange}
                  value={inputs.other}
                  autoComplete='new-password'
                />
              </Form.Field>
            )
          }
          <Form.Field>
            <Form.Dropdown
              label='模型'
              placeholder={'请选择该渠道所支持的模型'}
              name='models'
              required
              fluid
              multiple
              selection
              onChange={handleInputChange}
              value={inputs.models}
              autoComplete='new-password'
              options={modelOptions}
            />
          </Form.Field>
          <div style={{ lineHeight: '40px', marginBottom: '12px' }}>
            <Button type={'button'} onClick={() => {
              handleInputChange(null, { name: 'models', value: basicModels });
            }}>填入基础模型</Button>
            <Button type={'button'} onClick={() => {
              handleInputChange(null, { name: 'models', value: fullModels });
            }}>填入所有模型</Button>
            <Button type={'button'} onClick={() => {
              handleInputChange(null, { name: 'models', value: [] });
            }}>清除所有模型</Button>
            <Input
              action={
                <Button type={'button'} onClick={addCustomModel}>填入</Button>
              }
              placeholder='输入自定义模型名称'
              value={customModel}
              onChange={(e, { value }) => {
                setCustomModel(value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  addCustomModel();
                  e.preventDefault();
                }
              }}
            />
          </div>
          <Form.Field>
            <Form.TextArea
              label='模型重定向'
              placeholder={`此项可选，用于修改请求体中的模型名称，为一个 JSON 字符串，键为请求中模型名称，值为要替换的模型名称，例如：\n${JSON.stringify(MODEL_MAPPING_EXAMPLE, null, 2)}`}
              name='model_mapping'
              onChange={handleInputChange}
              value={inputs.model_mapping}
              style={{ minHeight: 150, fontFamily: 'JetBrains Mono, Consolas' }}
              autoComplete='new-password'
            />
          </Form.Field>
          {
            batch ? <Form.Field>
              <Form.TextArea
                label='密钥'
                name='key'
                required
                placeholder={'请输入密钥，一行一个'}
                onChange={handleInputChange}
                value={inputs.key}
                style={{ minHeight: 150, fontFamily: 'JetBrains Mono, Consolas' }}
                autoComplete='new-password'
              />
            </Form.Field> : <Form.Field>
              <Form.Input
                label='密钥'
                name='key'
                required
                placeholder={type2secretPrompt(inputs.type)}
                onChange={handleInputChange}
                value={inputs.key}
                autoComplete='new-password'
              />
            </Form.Field>
          }
          {
            !isEdit && (
              <Form.Checkbox
                checked={batch}
                label='批量创建'
                name='batch'
                onChange={() => setBatch(!batch)}
              />
            )
          }
          {
            inputs.type !== 3 && inputs.type !== 8 && inputs.type !== 22 && (
              <Form.Field>
                <Form.Input
                  label='代理'
                  name='base_url'
                  placeholder={'此项可选，用于通过代理站来进行 API 调用，请输入代理站地址，格式为：https://domain.com'}
                  onChange={handleInputChange}
                  value={inputs.base_url}
                  autoComplete='new-password'
                />
              </Form.Field>
            )
          }
          {
            inputs.type === 22 && (
              <Form.Field>
                <Form.Input
                  label='私有部署地址'
                  name='base_url'
                  placeholder={'请输入私有部署地址，格式为：https://fastgpt.run/api/openapi'}
                  onChange={handleInputChange}
                  value={inputs.base_url}
                  autoComplete='new-password'
                />
              </Form.Field>
            )
          }
          <Button onClick={handleCancel}>取消</Button>
          <Button type={isEdit ? 'button' : 'submit'} positive onClick={submit}>提交</Button>
        </Form>
      </Segment>
    </>
  );
};

export default EditChannel;
